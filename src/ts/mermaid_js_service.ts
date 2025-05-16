import { AzureDevOpsClient } from "./azure_dev_ops_client";
import { DiagramType } from "./enums";
import { IWorkItemTypeState } from "./interfaces/work_item_interfaces";
import { MermaidJsClient } from "./mermaid_js_client";
import { Settings } from "./settings";

export class MermaidJsService {
    /**
     * HTTP client used to interface with Azure DevOps APIs.
     */
    private static azureDevOpsClient: AzureDevOpsClient;

    private static mermaidJsClient: MermaidJsClient;

    static async refreshDiagram() {
        if (!(await MermaidJsService.isAuthenticated())) {
            return;
        }

        const featureWorkItems = await MermaidJsService.azureDevOpsClient
            .getFeatureWorkItems(Settings.context.featureWorkItemId);
        const featureWorkItem = featureWorkItems
            .find(workItem => workItem.fields["System.WorkItemType"] === "Feature");
        const childWorkItems = featureWorkItems
            .filter(workItem => workItem.fields["System.WorkItemType"] !== "Feature");

        const workItemTypeStatePromises = childWorkItems.reduce((promises, childWorkItem) => {
            const workItemType = childWorkItem.fields["System.WorkItemType"];

            if (!(workItemType in promises)) {
                promises[workItemType] = MermaidJsService.azureDevOpsClient
                    .getWorkItemTypeStates(workItemType);
            }

            return promises;
        }, {});

        const workItemTypeStateMap: Record<string, IWorkItemTypeState[]> = Object.fromEntries(
            await Promise.all(Object.entries(workItemTypeStatePromises).map(async ([workItemType, promise]) => {
                const response = await promise as any;

                return [workItemType, response.value];
            })));

        const workItemsUpdates = await Promise.all(childWorkItems.map((childWorkItem) =>
            MermaidJsService.azureDevOpsClient.getWorkItemUpdates(childWorkItem.id)));

        const workItemUpdatesMap = workItemsUpdates
            .map(workItemUpdates => workItemUpdates.value
                .sort((a: any, b: any) => a.revisedDate.localeCompare(b.revisedDate)))
            .map(sortedWorkItemUpdates => {
                // Update the initial work item update that has a revisedDate of Date.Max.
                sortedWorkItemUpdates.at(-1).revisedDate = new Date().toISOString();

                return sortedWorkItemUpdates;
            })
            .reduce((workItemUpdatesMap, sortedWorkItemUpdates) => {
                workItemUpdatesMap[sortedWorkItemUpdates[0].workItemId]
                    = MermaidJsService.countStateDays(sortedWorkItemUpdates);

                return workItemUpdatesMap;
            }, {});

        childWorkItems.forEach(childWorkItem => {
            childWorkItem.fields["ADOG.UpdatesMap"] = workItemUpdatesMap[childWorkItem.id];
        });

        MermaidJsService.mermaidJsClient = new MermaidJsClient(
            new Date(featureWorkItem!.fields["Microsoft.VSTS.Scheduling.StartDate"]),
            childWorkItems,
            workItemTypeStateMap);

        if (Settings.userInterface.diagramType === DiagramType.Gantt) {
            await MermaidJsService.mermaidJsClient.renderGanttDiagram();
        } else {
            await MermaidJsService.mermaidJsClient.renderDependencyDiagram();
        }
    }

    static async showWorkItemInfo(workItemId: number) {
        const workItem = MermaidJsService.mermaidJsClient.getWorkItem(workItemId);

        console.log("Start Date:", workItem?.fields["ADOG.ProjectedStartDate"]);
        console.log("End Date  :", workItem?.fields["ADOG.ProjectedEndDate"]);
        console.log("Updates   :", workItem?.fields["ADOG.UpdatesMap"]);
    }

    private static async isAuthenticated(): Promise<boolean> {
        if (!MermaidJsService.azureDevOpsClient || !(await MermaidJsService.azureDevOpsClient.hasValidContext())) {
            MermaidJsService.azureDevOpsClient = new AzureDevOpsClient(
                Settings.authentication.userEmail,
                Settings.authentication.personalAccessToken);

            return await MermaidJsService.azureDevOpsClient.hasValidContext();
        }

        return true;
    }

    private static countStateDays(items: any[]): Record<string, number> {
        if (items.length === 0) return {};

        const stateDays: Record<string, number> = {};
        let previousDate = new Date(items[0].revisedDate);
        let currentState = items[0]?.fields?.["System.State"]?.newValue ?? "To Do";

        for (let i = 1; i < items.length; i++) {
            const item = items[i];
            const currentDate = new Date(item.revisedDate);
            const timeDifference = (currentDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24); // Convert ms to days

            stateDays[currentState] = (stateDays[currentState] || 0) + timeDifference;

            currentState = item?.fields?.["System.State"]?.newValue ?? currentState;
            previousDate = currentDate;
        }

        return stateDays;
    }
}