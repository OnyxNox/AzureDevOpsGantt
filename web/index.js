window.onload = handleWindowOnLoad;

const mermaidConfiguration = {
    startOnLoad: false,
    theme: "dark",
    flowchart: { useMaxWidth: true },
    gantt: { useWidth: 1200 },
};

mermaid.initialize(mermaidConfiguration);

/**
 * Get work item identifier from a direct work item URL.
 * @param {string} workItemUrl Direct work item URL.
 * @returns {number} Work item identifier.
 */
const getWorkItemIdFromUrl = (workItemUrl) =>
    parseInt(workItemUrl.substring(workItemUrl.lastIndexOf('/') + 1), 10);

const getDateString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
};

async function handleDiagramTypeChange(diagramType) {
    const diagram = diagramType == "gantt"
        ? localStorage.getItem(Constants.localStorage.GANTT_DIAGRAM_KEY)
        : localStorage.getItem(Constants.localStorage.DEPENDENCY_DIAGRAM_KEY);

    localStorage.setItem(Constants.localStorage.SETTINGS_KEY, diagramType);

    document.getElementById(Constants.userInterface.MERMAID_DIAGRAM_OUTPUT_ELEMENT_ID).innerHTML =
        (await mermaid.render("updatedGraph", diagram)).svg;
}

/**
 * Handle the form's onSubmit event.
 */
async function handleFormOnSubmit(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const context = {
        dependencyRelation: formData.get(Constants.userInterface.DEPENDENCY_RELATION_ELEMENT_ID)
            ?? "",
        featureWorkItemId: formData.get(Constants.userInterface.FEATURE_WORK_ITEM_ID_ELEMENT_ID)
            ?? 0,
        organizationName: formData.get(Constants.userInterface.ORGANIZATION_NAME_ELEMENT_ID) ?? "",
        projectName: formData.get(Constants.userInterface.PROJECT_NAME_ELEMENT_ID) ?? "",
        userEmail: formData.get(Constants.userInterface.USER_EMAIL_ELEMENT_ID) ?? "",
    };

    localStorage.setItem(Constants.localStorage.CONTEXT_KEY, JSON.stringify(context));

    const azureDevOpsClient = new AzureDevOpsClient(
        context.userEmail,
        formData.get("personalAccessToken"),
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
                childWorkItemRelation.attributes.name == context.dependencyRelation)
            .map(dependencyWorkItemRelation => getWorkItemIdFromUrl(dependencyWorkItemRelation.url))
            .map(dependencyWorkItemId =>
                childWorkItems.findIndex(childWorkItem => childWorkItem.id == dependencyWorkItemId))
            .forEach(dependencyWorkItemIndex =>
                dependencyGraph.addEdge(childWorkItemIndex, dependencyWorkItemIndex));
    });

    let dependencyGraphNodes = dependencyGraph.getNodes();

    let dependencyDiagram = "flowchart TD\n";
    dependencyDiagram += dependencyGraphNodes
        .map(node => `    ${node.data.id}[${node.data.fields["System.Title"]}]`)
        .join('\n');
    dependencyDiagram += '\n' + dependencyGraphNodes
        .flatMap(node => node.parentNodeIndices.map(parentNodeIndex =>
            `    ${dependencyGraphNodes[parentNodeIndex].data.id} --> ${node.data.id}`
        ))
        .join('\n');

    localStorage.setItem(Constants.localStorage.DEPENDENCY_DIAGRAM_KEY, dependencyDiagram);

    const featureStartDate =
        new Date(featureWorkItem.fields["Microsoft.VSTS.Scheduling.StartDate"]);

    let ganttDiagram = "gantt\n    dateFormat YYYY-MM-DD\n    excludes weekends\n"
    ganttDiagram += "    Section Milestones\n";
    ganttDiagram +=
        `    Feature Start : milestone, featureStart, ${getDateString(featureStartDate)}, 1d\n`;
    ganttDiagram += "    Section Default\n";

    let scheduledWorkItemIds = [];

    while (scheduledWorkItemIds.length < childWorkItems.length) {
        let workItemsToBeScheduled = dependencyGraphNodes
            .filter(node => !scheduledWorkItemIds.includes(node.data.id))
            .filter(node => node.parentNodeIndices.every(parentNodeIndex =>
                scheduledWorkItemIds.includes(childWorkItems[parentNodeIndex].id)
            ))
            .map(node => node.data);

        workItemsToBeScheduled.forEach(workItemToBeScheduled => {
            const workItemTitle = workItemToBeScheduled.fields["System.Title"].replace(':', '_');

            ganttDiagram += `    ${workItemTitle} : ${workItemToBeScheduled.fields["Microsoft.VSTS.Scheduling.RemainingWork"]}d\n`;

            scheduledWorkItemIds.push(workItemToBeScheduled.id);
        });
    }

    localStorage.setItem(Constants.localStorage.GANTT_DIAGRAM_KEY, ganttDiagram);

    const selectedDiagramType =
        document.querySelector('input[type="radio"][name="diagramType"]:checked').value == "gantt"
            ? ganttDiagram : dependencyDiagram;

    document.getElementById(Constants.userInterface.MERMAID_DIAGRAM_OUTPUT_ELEMENT_ID).innerHTML =
        (await mermaid.render("updatedGraph", selectedDiagramType)).svg;

    document.getElementById(Constants.userInterface.CONTROL_PANEL_TOGGLE_ELEMENT_ID).checked =
        false;
}

/**
 * Handle the windows's onLoad event.
 */
async function handleWindowOnLoad() {
    const previousContext = localStorage.getItem(Constants.localStorage.CONTEXT_KEY);

    if (previousContext) {
        const formData = JSON.parse(previousContext);

        document.getElementById(Constants.userInterface.DEPENDENCY_RELATION_ELEMENT_ID).value =
            formData.dependencyRelation ?? "";
        document.getElementById(Constants.userInterface.FEATURE_WORK_ITEM_ID_ELEMENT_ID).value =
            formData.featureWorkItemId ?? "";
        document.getElementById(Constants.userInterface.ORGANIZATION_NAME_ELEMENT_ID).value =
            formData.organizationName ?? "";
        document.getElementById(Constants.userInterface.PROJECT_NAME_ELEMENT_ID).value =
            formData.projectName ?? "";
        document.getElementById(Constants.userInterface.USER_EMAIL_ELEMENT_ID).value =
            formData.userEmail ?? "";
    } else {
        document.getElementById(Constants.userInterface.CONTROL_PANEL_TOGGLE_ELEMENT_ID).checked =
            true;
    }

    const previousSettings = localStorage.getItem(Constants.localStorage.SETTINGS_KEY);
    const diagram = previousSettings == DiagramType.Gantt
        ? localStorage.getItem(Constants.localStorage.GANTT_DIAGRAM_KEY)
        : localStorage.getItem(Constants.localStorage.DEPENDENCY_DIAGRAM_KEY);

    if (diagram) {
        document.getElementById(Constants.userInterface.MERMAID_DIAGRAM_OUTPUT_ELEMENT_ID).innerHTML
            = (await mermaid.render("updatedGraph", diagram)).svg;
    }

    document.querySelector(`input[type="radio"][name="diagramType"][value=${previousSettings}]`)
        .checked = true;
}