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

        const workItemUpdates = await Promise.all(childWorkItems.map(workItem =>
            MermaidJsService.azureDevOpsClient.getWorkItemUpdates(workItem.id)));

        // This is not correct, after the feature set is defined, the default should be set to the
        // first work item's start date. What does it mean to "start"?
        const featureStartDate =
            Date.tryParse(featureWorkItem.fields[AdoField.StartDate]) ?? asOf ?? new Date();

        MermaidJsService.mermaidJsClient = new MermaidJsClient(
            featureStartDate, childWorkItems, workItemTypeStatesMap, workItemUpdates);

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