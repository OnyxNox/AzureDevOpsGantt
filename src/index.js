window.onload = handleWindowOnLoad;

mermaid.initialize({
    startOnLoad: false,
    theme: "dark",
    flowchart: { useMaxWidth: true },
    gantt: { useWidth: 1200 },
});

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