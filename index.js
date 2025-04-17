window.onload = handleWindowOnLoad;

const mermaidConfiguration = {
    startOnLoad: false,
    theme: "dark",
    flowchart: { useMaxWidth: true },
    gantt: { useWidth: 1200 },
};

mermaid.initialize(mermaidConfiguration);

function cacheSetting(key, value) {
    Settings[key] = value;

    localStorage.setItem(Constants.localStorage.SETTINGS_KEY, JSON.stringify(Settings));
}

async function handleDiagramTypeChange(diagramType) {
    Settings.selectedDiagramType = diagramType;

    localStorage.setItem(Constants.localStorage.SETTINGS_KEY, JSON.stringify(Settings));

    const selectedDiagram = diagramType == DiagramType.Gantt
        ? localStorage.getItem(Constants.localStorage.GANTT_DIAGRAM_KEY)
        : localStorage.getItem(Constants.localStorage.DEPENDENCY_DIAGRAM_KEY);

    if (selectedDiagram) {
        document.getElementById(Constants.userInterface.MERMAID_DIAGRAM_OUTPUT_ELEMENT_ID)
            .innerHTML = (await mermaid.render("updatedGraph", selectedDiagram)).svg;
    }
}

/**
 * Handle the control panel form's onSubmit event.
 */
async function handleFormOnSubmit(event) {
    event.preventDefault();

    document.getElementById(Constants.userInterface.LOADING_OVERLAY_ELEMENT_ID)
        .classList.add("show");

    const formData = new FormData(event.target);
    const context = {
        featureWorkItemId: formData.get(Constants.userInterface.FEATURE_WORK_ITEM_ID_ELEMENT_ID),
        organizationName: formData.get(Constants.userInterface.ORGANIZATION_NAME_ELEMENT_ID),
        projectName: formData.get(Constants.userInterface.PROJECT_NAME_ELEMENT_ID),
        userEmail: formData.get(Constants.userInterface.USER_EMAIL_ELEMENT_ID),
    };

    Settings.dependencyRelation =
        formData.get(Constants.userInterface.DEPENDENCY_RELATION_ELEMENT_ID)
        ?? Settings.dependencyRelation;

    localStorage.setItem(Constants.localStorage.CONTEXT_KEY, JSON.stringify(context));
    localStorage.setItem(Constants.localStorage.SETTINGS_KEY, JSON.stringify(Settings));

    const azureDevOpsClient = new AzureDevOpsClient(
        context.userEmail,
        formData.get(Constants.userInterface.PERSON_ACCESS_TOKEN_ELEMENT_ID),
        context.organizationName,
        context.projectName,
    );

    const featureWorkItem = await azureDevOpsClient.getWorkItem(context.featureWorkItemId);

    const childWorkItemIds = featureWorkItem
        .relations
        .filter(workItemRelation => workItemRelation.attributes.name == "Child")
        .map(childWorkItem => getWorkItemIdFromUrl(childWorkItem.url));

    const childWorkItems = (await azureDevOpsClient.getWorkItems(childWorkItemIds)).value;

    const dependencyGraph = new DependencyGraph();

    childWorkItems.forEach((childWorkItem, childWorkItemIndex) => {
        dependencyGraph.addNode(childWorkItem);

        childWorkItem
            .relations
            .filter(childWorkItemRelation =>
                childWorkItemRelation.attributes.name == Settings.dependencyRelation)
            .map(dependencyWorkItemRelation => getWorkItemIdFromUrl(dependencyWorkItemRelation.url))
            .map(dependencyWorkItemId =>
                childWorkItems.findIndex(childWorkItem => childWorkItem.id == dependencyWorkItemId))
            .forEach(dependencyWorkItemIndex =>
                dependencyGraph.addEdge(childWorkItemIndex, dependencyWorkItemIndex));
    });

    const diagramClient = new DiagramClient(dependencyGraph);

    let dependencyDiagram = diagramClient.getDependencyDiagram();

    localStorage.setItem(Constants.localStorage.DEPENDENCY_DIAGRAM_KEY, dependencyDiagram);

    const featureStartDate = new Date(featureWorkItem.fields[Settings.featureStartDateField]);

    const ganttDiagram = diagramClient.getGanttDiagram(featureStartDate);

    localStorage.setItem(Constants.localStorage.GANTT_DIAGRAM_KEY, ganttDiagram);

    const diagramType = Settings.selectedDiagramType == DiagramType.Gantt
        ? ganttDiagram : dependencyDiagram;

    document.getElementById(Constants.userInterface.MERMAID_DIAGRAM_OUTPUT_ELEMENT_ID)
        .innerHTML = (await mermaid.render("updatedGraph", diagramType)).svg;

    document.getElementById(Constants.userInterface.CONTROL_PANEL_TOGGLE_ELEMENT_ID)
        .checked = false;

    document.getElementById(Constants.userInterface.LOADING_OVERLAY_ELEMENT_ID)
        .classList.remove("show");
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