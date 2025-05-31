import { AzureDevOpsClient } from "./azure_dev_ops_client";
import { AdoField, AdogField, DiagramType } from "./enums";
import { IWorkItemTypeState } from "./interfaces/work_item_interfaces";
import { MermaidJsClient } from "./mermaid_js_client";
import { Settings } from "./settings";

export class MermaidJsService {
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

        const asOf = Date.tryParse(Settings.userInterface.asOf);

        const featureWorkItems = await MermaidJsService.azureDevOpsClient.getFeatureWorkItems(
            Settings.context.featureWorkItemId, asOf);
        const featureWorkItem = featureWorkItems.find(workItem =>
            workItem.fields[AdoField.WorkItemType] === "Feature");
        const childWorkItems = featureWorkItems.filter(workItem =>
            workItem.fields[AdoField.WorkItemType] !== "Feature");

        const workItemTypeStatesMap =
            await MermaidJsService.getWorkItemTypeStatesMap(childWorkItems);

        const workItemStateDurationMap =
            await MermaidJsService.getWorkItemStateDurationMap(childWorkItems);

        childWorkItems.forEach(workItem => {
            workItem.fields[AdogField.StateDurationMap] = workItemStateDurationMap[workItem.id];
        });

        // This is not correct, after the feature set is defined, the default should be set to the
        // first work item's start date. What does it mean to "start"?
        const featureStartDate =
            Date.tryParse(featureWorkItem.fields[AdoField.StartDate]) ?? asOf ?? new Date();

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
        title.value = workItem?.fields[AdoField.Title] ?? "No Work Item Selected";

        const projectedStartDate = document.getElementById("projectedStartDate") as HTMLInputElement;
        projectedStartDate.value = workItem?.fields[AdogField.ProjectedStartDate].toISODateString();

        const projectedEndDate = document.getElementById("projectedEndDate") as HTMLInputElement;
        projectedEndDate.value = workItem?.fields[AdogField.ProjectedEndDate].toISODateString();

        const estimatedEffort = document.getElementById("estimatedEffort") as HTMLInputElement;
        estimatedEffort.value = workItem?.fields[Settings.environment.effortField] ?? 0;

        const updatesMapTBody = document.createElement("tbody");
        updatesMapTBody.id = "updatesMap";

        Object.entries(workItem?.fields[AdogField.StateDurationMap] ?? {})
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
                    workItemUpdate?.fields?.[AdoField.StateChangeDate] !== undefined);

                const asOf = Settings.userInterface.asOf
                    ? new Date(Settings.userInterface.asOf).toISOString()
                    : new Date().toISOString();


                if (workItemUpdates.length > 1) {
                    workItemUpdates.sort((a: any, b: any) => b.rev - a.rev);

                    workItemUpdates.pop();

                    const pseudoWorkItemUpdate = {
                        fields: {
                            [AdoField.StateChangeDate]: {
                                oldValue: workItemUpdates[0].fields[AdoField.StateChangeDate].newValue,
                                newValue: asOf,
                            },
                            [AdoField.State]: {
                                oldValue: workItemUpdates[0].fields[AdoField.State].newValue,
                            },
                        },
                    };

                    workItemUpdates.push(pseudoWorkItemUpdate);
                } else {
                    workItemUpdates[0].fields[AdoField.StateChangeDate].oldValue = workItemUpdates[0].fields[AdoField.StateChangeDate].newValue;
                    workItemUpdates[0].fields[AdoField.StateChangeDate].newValue = asOf;
                    workItemUpdates[0].fields[AdoField.State].oldValue = workItemUpdates[0].fields[AdoField.State].newValue;
                }

                workItemUpdates = workItemUpdates.filter((workItemUpdate: any) =>
                    workItemUpdate.fields[AdoField.StateChangeDate].oldValue <= asOf);

                return workItemUpdates;
            })
            .reduce((workItemsStateDurationMap, workItemsStateUpdates) => {
                workItemsStateDurationMap[workItemsStateUpdates[0].workItemId] = workItemsStateUpdates
                    .reduce((workItemStateDurationMap: any, workItemStateUpdate: any) => {
                        const stateChangeDates = workItemStateUpdate!.fields![AdoField.StateChangeDate];

                        const stateDuration = new Date(stateChangeDates.oldValue)
                            .getBusinessDayCount(new Date(stateChangeDates.newValue)) - 1;

                        const oldState = workItemStateUpdate!.fields![AdoField.State].oldValue;
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
            const workItemType = workItem.fields[AdoField.WorkItemType];

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