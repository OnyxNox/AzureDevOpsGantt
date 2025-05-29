import { AzureDevOpsClient } from "./azure_dev_ops_client";
import { DiagramType } from "./enums";
import { IWorkItemTypeState } from "./interfaces/work_item_interfaces";
import { MermaidJsClient } from "./mermaid_js_client";
import { Settings } from "./settings";

export class MermaidJsService {
    private static readonly STATE_DURATION_MAP_FIELD: string = "ADOG.StateDurationMap";

    private static readonly UPDATE_STATE_CHANGE_DATE_FIELD: string =
        "Microsoft.VSTS.Common.StateChangeDate";

    private static readonly WORK_ITEM_START_DATE_FIELD: string =
        "Microsoft.VSTS.Scheduling.StartDate";

    private static readonly WORK_ITEM_STATE_FIELD: string = "System.State";

    private static readonly WORK_ITEM_TYPE_FIELD: string = "System.WorkItemType";

    /**
     * HTTP client used to interface with Azure DevOps APIs.
     */
    private static azureDevOpsClient: AzureDevOpsClient;

    /**
     * Client used to interface with Mermaid JS diagrams.
     */
    private static mermaidJsClient: MermaidJsClient;

    /**
     * Refresh the Mermaid JS diagram with the latest Azure DevOps data.
     */
    public static async refreshDiagram(): Promise<void> {
        if (!(await MermaidJsService.isAuthenticated())) {
            return;
        }

        const featureWorkItems = await MermaidJsService.azureDevOpsClient.getFeatureWorkItems(
            Settings.context.featureWorkItemId,
            Date.tryParse(Settings.userInterface.asOf));
        const featureWorkItem = featureWorkItems.find(workItem =>
            workItem.fields[MermaidJsService.WORK_ITEM_TYPE_FIELD] === "Feature");
        const childWorkItems = featureWorkItems.filter(workItem =>
            workItem.fields[MermaidJsService.WORK_ITEM_TYPE_FIELD] !== "Feature");

        const workItemTypeStatesMap =
            await MermaidJsService.getWorkItemTypeStatesMap(childWorkItems);

        const workItemStateDurationMap =
            await MermaidJsService.getWorkItemStateDurationMap(childWorkItems);

        childWorkItems.forEach(workItem => {
            workItem.fields[MermaidJsService.STATE_DURATION_MAP_FIELD] =
                workItemStateDurationMap[workItem.id];
        });

        const featureStartDate =
            Date.tryParse(featureWorkItem.fields[MermaidJsService.WORK_ITEM_START_DATE_FIELD])
            ?? new Date();

        MermaidJsService.mermaidJsClient = new MermaidJsClient(
            featureStartDate, childWorkItems, workItemTypeStatesMap);

        if (Settings.userInterface.diagramType === DiagramType.Gantt) {
            await MermaidJsService.mermaidJsClient.renderGanttDiagram();
        } else {
            await MermaidJsService.mermaidJsClient.renderDependencyDiagram();
        }
    }

    /**
     * Show details of the selected work item in the control panel, based on the selection in the
     * Mermaid JS diagram.
     */
    public static async showWorkItemInfo(workItemId: number): Promise<void> {
        const workItem = MermaidJsService.mermaidJsClient.getWorkItem(workItemId);

        const title = document.getElementById("title") as HTMLInputElement;
        title.value = workItem?.fields["System.Title"] ?? "No Work Item Selected";

        const projectedStartDate = document.getElementById("projectedStartDate") as HTMLInputElement;
        projectedStartDate.value = workItem?.fields["ADOG.ProjectedStartDate"].toISODateString();

        const projectedEndDate = document.getElementById("projectedEndDate") as HTMLInputElement;
        projectedEndDate.value = workItem?.fields["ADOG.ProjectedEndDate"].toISODateString();

        const estimatedEffort = document.getElementById("estimatedEffort") as HTMLInputElement;
        estimatedEffort.value = workItem?.fields[Settings.environment.effortField] ?? 0;

        const updatesMapTBody = document.createElement("tbody");
        updatesMapTBody.id = "updatesMap";

        Object.entries(workItem?.fields[MermaidJsService.STATE_DURATION_MAP_FIELD] ?? {})
            .forEach(([state, dayCount]) => {
                const tableRow = document.createElement("tr");

                const rowState = document.createElement("td");
                rowState.textContent = state;

                const dayCountElement = document.createElement("td");
                dayCountElement.textContent = Math.floor(dayCount as number).toString() + " Days";

                tableRow.appendChild(rowState);
                tableRow.appendChild(dayCountElement);
                updatesMapTBody.appendChild(tableRow);
            });

        document.getElementById("updatesMap")?.replaceWith(updatesMapTBody);
    }

    /**
     * Get a map of work item IDs and the number of business days spent in each state.
     */
    private static async getWorkItemStateDurationMap(workItems: any[]) {
        const workItemsUpdates = await Promise.all(workItems.map(workItem =>
            MermaidJsService.azureDevOpsClient.getWorkItemUpdates(workItem.id)));

        return workItemsUpdates
            .map(workItemUpdates => {
                workItemUpdates = workItemUpdates.value.filter((workItemUpdate: any) =>
                    workItemUpdate?.fields?.[MermaidJsService.UPDATE_STATE_CHANGE_DATE_FIELD] !== undefined);

                const asOf = Settings.userInterface.asOf
                    ? new Date(Settings.userInterface.asOf).toISOString()
                    : new Date().toISOString();


                if (workItemUpdates.length > 1) {
                    workItemUpdates.sort((a: any, b: any) => b.rev - a.rev);

                    workItemUpdates.pop();

                    const pseudoWorkItemUpdate = {
                        fields: {
                            [MermaidJsService.UPDATE_STATE_CHANGE_DATE_FIELD]: {
                                oldValue: workItemUpdates[0].fields[MermaidJsService.UPDATE_STATE_CHANGE_DATE_FIELD].newValue,
                                newValue: asOf,
                            },
                            [MermaidJsService.WORK_ITEM_STATE_FIELD]: {
                                oldValue: workItemUpdates[0].fields[MermaidJsService.WORK_ITEM_STATE_FIELD].newValue,
                            },
                        },
                    };

                    workItemUpdates.push(pseudoWorkItemUpdate);
                } else {
                    workItemUpdates[0].fields[MermaidJsService.UPDATE_STATE_CHANGE_DATE_FIELD].oldValue = workItemUpdates[0].fields[MermaidJsService.UPDATE_STATE_CHANGE_DATE_FIELD].newValue;
                    workItemUpdates[0].fields[MermaidJsService.UPDATE_STATE_CHANGE_DATE_FIELD].newValue = asOf;
                    workItemUpdates[0].fields[MermaidJsService.WORK_ITEM_STATE_FIELD].oldValue = workItemUpdates[0].fields[MermaidJsService.WORK_ITEM_STATE_FIELD].newValue;
                }

                workItemUpdates = workItemUpdates.filter((workItemUpdate: any) =>
                    workItemUpdate.fields[MermaidJsService.UPDATE_STATE_CHANGE_DATE_FIELD].oldValue <= asOf);

                return workItemUpdates;
            })
            .reduce((workItemsStateDurationMap, workItemsStateUpdates) => {
                workItemsStateDurationMap[workItemsStateUpdates[0].workItemId] = workItemsStateUpdates
                    .reduce((workItemStateDurationMap: any, workItemStateUpdate: any) => {
                        const stateChangeDates = workItemStateUpdate!.fields![MermaidJsService.UPDATE_STATE_CHANGE_DATE_FIELD];

                        const stateDuration = new Date(stateChangeDates.oldValue)
                            .getBusinessDayCount(new Date(stateChangeDates.newValue)) - 1;

                        const oldState = workItemStateUpdate!.fields![MermaidJsService.WORK_ITEM_STATE_FIELD].oldValue;
                        workItemStateDurationMap[oldState] ??= 0;
                        workItemStateDurationMap[oldState] += stateDuration;

                        return workItemStateDurationMap;
                    }, {});

                return workItemsStateDurationMap;
            }, {});
    }

    /**
     * Get a map of work item types and their possible states.
     */
    private static async getWorkItemTypeStatesMap(workItems: any[]): Promise<Record<string, IWorkItemTypeState[]>> {
        const workItemTypeStatePromises = workItems.reduce((promises, workItem) => {
            const workItemType = workItem.fields[MermaidJsService.WORK_ITEM_TYPE_FIELD];

            if (!(workItemType in promises)) {
                promises[workItemType] = MermaidJsService.azureDevOpsClient
                    .getWorkItemTypeStates(workItemType);
            }

            return promises;
        }, {});

        return Object.fromEntries(
            await Promise.all(Object.entries(workItemTypeStatePromises).map(async ([workItemType, promise]) => {
                const response = await promise as any;

                return [workItemType, response.value];
            })));
    }

    /**
     * Check if the Azure DevOps client is authenticated.
     */
    private static async isAuthenticated(): Promise<boolean> {
        if (!MermaidJsService.azureDevOpsClient || !(await MermaidJsService.azureDevOpsClient.hasValidContext())) {
            MermaidJsService.azureDevOpsClient = new AzureDevOpsClient(
                Settings.authentication.userEmail,
                Settings.authentication.personalAccessToken);

            return await MermaidJsService.azureDevOpsClient.hasValidContext();
        }

        return true;
    }
}