/**
 * Encapsulates the Control Panel's logic.
 */
class ControlPanel {
    /**
     * Handle the control panel form's onSubmit event.
     * @param {SubmitEvent} event Form submit event.
     */
    static async handleFormOnSubmit(event) {
        event.preventDefault();

        document.getElementById(Constants.userInterface.LOADING_OVERLAY_ELEMENT_ID)
            .classList.add("show");

        const featureWorkItems = await ControlPanel.#getFeatureWorkItemsAsync();
        const featureWorkItem = featureWorkItems.find(ControlPanel.#isFeatureWorkItem);

        const diagramClient = new DiagramClient(featureWorkItems.filter(
            featureWorkItem => !ControlPanel.#isFeatureWorkItem(featureWorkItem)));

        let dependencyDiagram = diagramClient.getDependencyDiagram();

        const ganttDiagram = diagramClient.getGanttDiagram(new Date(
            featureWorkItem.fields[Constants.azure_dev_ops.FEATURE_WORK_ITEM_START_DATE_FIELD]));

        localStorage.setItem(Constants.localStorage.DEPENDENCY_DIAGRAM_KEY, dependencyDiagram);
        localStorage.setItem(Constants.localStorage.GANTT_DIAGRAM_KEY, ganttDiagram);

        const diagramType = Settings.actionBar.diagramType == DiagramType.Gantt
            ? ganttDiagram : dependencyDiagram;

        document.getElementById(Constants.userInterface.MERMAID_DIAGRAM_OUTPUT_ELEMENT_ID)
            .innerHTML = (await mermaid.render("updatedGraph", diagramType)).svg;

        document.getElementById(Constants.userInterface.CONTROL_PANEL_TOGGLE_ELEMENT_ID)
            .checked = false;

        document.getElementById(Constants.userInterface.LOADING_OVERLAY_ELEMENT_ID)
            .classList.remove("show");
    }

    /**
     * Get collection of Azure DevOps feature work items, including the feature work item.
     * @param {HTMLFormElement} htmlFormElement Control panel's HTML form element containing context
     * details.
     * @returns {[]} Array of Azure DevOps feature work items, including the feature work item.
     */
    static async #getFeatureWorkItemsAsync() {
        const azureDevOpsClient = new AzureDevOpsClient(
            Settings.authentication.userEmail,
            Settings.authentication.personalAccessToken,
            Settings.context.organizationName,
            Settings.context.projectName,
        );

        const featureWorkItems = [await azureDevOpsClient.getWorkItem(Settings.context.featureWorkItemId)];

        const childWorkItemIds = featureWorkItems[0]
            .relations
            .filter(workItemRelation =>
                workItemRelation.attributes.name === "Child")
            .map(childWorkItem => ControlPanel.getWorkItemIdFromUrl(childWorkItem.url));

        featureWorkItems.push(...(await azureDevOpsClient.getWorkItems(childWorkItemIds)).value);

        return featureWorkItems;
    }

    /**
     * Get work item identifier from a direct work item URL.
     * @param {string} workItemUrl Direct work item URL.
     * @returns {number} Work item identifier.
     */
    static getWorkItemIdFromUrl(workItemUrl) {
        return parseInt(workItemUrl.substring(workItemUrl.lastIndexOf('/') + 1), 10);
    }

    /**
     * Check if Azure DevOps work item is a Feature.
     * @param {Object} workItem Azure DevOps work item.
     * @returns {boolean} True if the Azure DevOps work item is a Feature, otherwise False.
     */
    static #isFeatureWorkItem(workItem) {
        return workItem.fields[Constants.azure_dev_ops.WORK_ITEM_TYPE_FIELD]
            === Constants.azure_dev_ops.FEATURE_WORK_ITEM_TYPE;
    }
}