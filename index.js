/**
 * Mermaid JS diagram type enumeration.
 */
const DiagramType = Object.freeze({
    /**
     * Mermaid JS flowchart showing a dependency hierarchy diagram.
     */
    Dependency: "dependency",

    /**
     * Mermaid JS gantt chart showing a schedule diagram.
     */
    Gantt: "gantt",
});

/**
 * Global settings used across the application.
 */
const Settings = (function () {
    return {
        dependencyRelation: "Tests",
        effortField: "Microsoft.VSTS.Scheduling.RemainingWork",
        effortFieldTimeSpan: "d",
        featureStartDateField: "Microsoft.VSTS.Scheduling.StartDate",
        priorityField: "Microsoft.VSTS.Common.Priority",
        resourceCount: 1,
        sectionTagPrefix: "Section:",
        titleField: "System.Title",
        selectedDiagramType: DiagramType.Gantt,
    };
})();

window.onload = handleWindowOnLoad;

/**
 * Write setting to local storage and refresh diagram from local storage.
 * @param {string} key Settings field key.
 * @param {any} value Settings field value.
 */
async function cacheSetting(key, value) {
    Settings[key] = value;

    localStorage.setItem(Constants.localStorage.SETTINGS_KEY, JSON.stringify(Settings));

    const selectedDiagram = Settings.diagramType === DiagramType.Gantt
        ? localStorage.getItem(Constants.localStorage.GANTT_DIAGRAM_KEY)
        : localStorage.getItem(Constants.localStorage.DEPENDENCY_DIAGRAM_KEY);

    if (selectedDiagram) {
        document.getElementById(Constants.userInterface.MERMAID_DIAGRAM_OUTPUT_ELEMENT_ID)
            .innerHTML = (await mermaid.render("updatedGraph", selectedDiagram)).svg;
    }
}

/**
 * Handle the windows's onLoad event; used to seed inputs from the previous session.
 */
async function handleWindowOnLoad() {
    const previousContext = localStorage.getItem(Constants.localStorage.CONTEXT_KEY);

    if (previousContext) {
        const context = JSON.parse(previousContext);

        document.getElementById(Constants.userInterface.FEATURE_WORK_ITEM_ID_ELEMENT_ID)
            .value = context.featureWorkItemId ?? "";
        document.getElementById(Constants.userInterface.ORGANIZATION_NAME_ELEMENT_ID)
            .value = context.organizationName ?? "";
        document.getElementById(Constants.userInterface.PROJECT_NAME_ELEMENT_ID)
            .value = context.projectName ?? "";
        document.getElementById(Constants.userInterface.USER_EMAIL_ELEMENT_ID)
            .value = context.userEmail ?? "";
        document.getElementById(Constants.userInterface.PERSON_ACCESS_TOKEN_ELEMENT_ID)
            .value = context.personAccessToken ?? "";
    } else {
        document.getElementById(Constants.userInterface.CONTROL_PANEL_TOGGLE_ELEMENT_ID)
            .checked = true;
    }

    const previousSettings = localStorage.getItem(Constants.localStorage.SETTINGS_KEY);
    const settings = previousSettings ? JSON.parse(previousSettings) : Settings;

    document.getElementById(Constants.userInterface.DEPENDENCY_RELATION_ELEMENT_ID)
        .value = settings.dependencyRelation;
    Settings.dependencyRelation = settings.dependencyRelation;

    document.getElementById(Constants.userInterface.RESOURCE_COUNT_ELEMENT_ID)
        .value = settings.resourceCount;
    Settings.resourceCount = settings.resourceCount;

    document
        .querySelector(
            `input[type="radio"][name="diagramType"][value=${settings.selectedDiagramType}]`)
        .checked = true;

    const selectedDiagram = settings.selectedDiagramType == DiagramType.Gantt
        ? localStorage.getItem(Constants.localStorage.GANTT_DIAGRAM_KEY)
        : localStorage.getItem(Constants.localStorage.DEPENDENCY_DIAGRAM_KEY);

    if (selectedDiagram) {
        document.getElementById(Constants.userInterface.MERMAID_DIAGRAM_OUTPUT_ELEMENT_ID)
            .innerHTML = (await mermaid.render("updatedGraph", selectedDiagram)).svg;
    }
}