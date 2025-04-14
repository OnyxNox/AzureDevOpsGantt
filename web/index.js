window.onload = handleWindowOnLoad;

mermaid.initialize({ startOnLoad: false, theme: "dark", gantt: { useWidth: 1200 } });

/**
 * Get work item identifier from given URL.
 */
const getWorkItemIdFromUrl = (url) => parseInt(url.substring(url.lastIndexOf('/') + 1), 10);

const getDateString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
};

/**
 * Handle the form's onSubmit event.
 */
async function handleFormOnSubmit(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const context = {
        dependencyRelationType: formData.get(DEPENDENCY_RELATION_TYPE_ID),
        featureWorkItemId: formData.get(FEATURE_WORK_ITEM_ID_ID),
        organizationName: formData.get(ORGANIZATION_NAME_ID),
        projectName: formData.get(PROJECT_NAME_ID),
        userEmail: formData.get(USER_EMAIL_ID),
    };

    localStorage.setItem(LOCAL_STORAGE_CONTEXT_KEY, JSON.stringify(context));

    const workItemsUrl = `${AZURE_DEV_OPS_DOMAIN}/${context.organizationName}`
        + `/${context.projectName}/_apis/wit/workitems`;
    const personalAccessToken = formData.get("personalAccessToken");
    const fetchOptions = {
        headers: {
            "Accept": "application/json",
            "Authorization": `Basic ${btoa(`${context.userEmail}:${personalAccessToken}`)}`,
        }
    }

    const featureFetchUrl = `${workItemsUrl}/${context.featureWorkItemId}`
        + `?${COMMON_QUERY_PARAMETERS}`;
    const featureWorkItem = await (await fetch(featureFetchUrl, fetchOptions)).json();

    const childWorkItemIds = featureWorkItem
        .relations
        .filter(workItemRelation => workItemRelation.attributes.name == "Child")
        .map(childWorkItem => getWorkItemIdFromUrl(childWorkItem.url))
        .join(',');

    const childrenFetchUrl = `${workItemsUrl}/?ids=${childWorkItemIds}&${COMMON_QUERY_PARAMETERS}`;
    const childWorkItems = (await (await fetch(childrenFetchUrl, fetchOptions)).json()).value;

    const dependency_graph = {
        nodes: [],
    };

    let diagram = "flowchart TD\n";

    childWorkItems.forEach(childWorkItem => {
        const parentWorkItemIds = childWorkItem
            .relations
            .filter(childWorkItemRelation =>
                childWorkItemRelation.attributes.name == context.dependencyRelationType)
            .map(childWorkItemRelation => getWorkItemIdFromUrl(childWorkItemRelation.url));

        dependency_graph.nodes.push({ data: childWorkItem, parentWorkItemIds });

        diagram += `    ${childWorkItem.id}[${childWorkItem.fields["System.Title"]}]\n`;
    });

    diagram += dependency_graph
        .nodes
        .flatMap(node => node.parentWorkItemIds
            .map(parentWorkItemId => `    ${parentWorkItemId} --> ${node.data.id}`))
        .join('\n');

    const featureStartDate =
        new Date(featureWorkItem.fields["Microsoft.VSTS.Scheduling.StartDate"]);

    let ganttDiagram = `gantt\n    title ${featureWorkItem.fields["System.Title"]}\n`

    ganttDiagram += "    dateFormat YYYY-MM-DD\n    excludes weekends\n";
    ganttDiagram += "    Section Milestones\n";
    ganttDiagram +=
        `    Feature Start : milestone, featureStart, ${getDateString(featureStartDate)}, 1d\n`;
    ganttDiagram += "    Section Default\n";

    let mappedNodeIds = [];

    while (mappedNodeIds.length < childWorkItems.length) {
        let nextNodes = dependency_graph
            .nodes
            .filter(node => !mappedNodeIds.includes(node.data.id)
                && node.parentWorkItemIds.every(parentWorkItemId => parentWorkItemId == node.data.id || mappedNodeIds.includes(parentWorkItemId)));

        nextNodes.forEach(nextNode => {
            const workItemTitle = nextNode.data.fields["System.Title"].replace(':', '_');

            ganttDiagram += `    ${workItemTitle} : ${nextNode.data.fields["Microsoft.VSTS.Scheduling.RemainingWork"]}d\n`;

            mappedNodeIds.push(nextNode.data.id);
        });
    }

    localStorage.setItem(LOCAL_STORAGE_DEPENDENCY_DIAGRAM_KEY, diagram);
    localStorage.setItem(LOCAL_STORAGE_GANTT_DIAGRAM_KEY, ganttDiagram);

    // document.getElementById(DEPENDENCY_DIAGRAM_OUTPUT_ID).innerHTML =
    //     (await mermaid.render("updatedGraph", diagram)).svg;

    document.getElementById(GANTT_DIAGRAM_OUTPUT_ID).innerHTML =
        (await mermaid.render("updatedGraph", ganttDiagram)).svg;

    document.getElementById(CONTEXT_TOGGLE_ID).checked = false;
}

/**
 * Handle the windows's onLoad event.
 */
async function handleWindowOnLoad() {
    const previousContext = localStorage.getItem(LOCAL_STORAGE_CONTEXT_KEY);

    if (previousContext) {
        const formData = JSON.parse(previousContext);
        document.getElementById(DEPENDENCY_RELATION_TYPE_ID).value = formData.dependencyRelationType
            || "";
        document.getElementById(FEATURE_WORK_ITEM_ID_ID).value = formData.featureWorkItemId || "";
        document.getElementById(ORGANIZATION_NAME_ID).value = formData.organizationName || "";
        document.getElementById(PROJECT_NAME_ID).value = formData.projectName || "";
        document.getElementById(USER_EMAIL_ID).value = formData.userEmail || "";
    } else {
        document.getElementById(CONTEXT_TOGGLE_ID).checked = true;
    }

    const previousDependencyGraph = localStorage.getItem(LOCAL_STORAGE_DEPENDENCY_DIAGRAM_KEY);

    // if (previousDependencyGraph) {
    //     document.getElementById(DEPENDENCY_DIAGRAM_OUTPUT_ID).innerHTML =
    //         (await mermaid.render("updatedGraph", previousDependencyGraph)).svg;
    // }

    const previousGanttDiagram = localStorage.getItem(LOCAL_STORAGE_GANTT_DIAGRAM_KEY);

    if (previousGanttDiagram) {
        document.getElementById(GANTT_DIAGRAM_OUTPUT_ID).innerHTML =
            (await mermaid.render("updatedGraph", previousGanttDiagram)).svg;
    } else {
        document.getElementById(GANTT_DIAGRAM_OUTPUT_ID).innerHTML = "No previous context has been found;"
            + " please fill out context panel and click the <b>Generate</b> button.";

        document.getElementById(ORGANIZATION_NAME_ID).focus();
    }
}