/**
 * Client used to generate Mermaid JS diagrams.
 * @param {Object} dependencyGraph Dependency graph used to describe Azure DevOps Feature child work
 * items dependency structure.
 */
function DiagramClient(dependencyGraph) {
    /**
     * Get Azure DevOps Feature child work items dependency diagram.
     * @returns Mermaid JS flowchart showing the hierarchy of Azure DevOps Feature child work items.
     */
    this.getDependencyDiagram = function () {
        let dependencyGraphNodes = dependencyGraph.getNodes();

        let dependencyDiagram = "flowchart TD\n";

        dependencyDiagram += dependencyGraphNodes
            .map(node => {
                const workItemTitle = node.data.fields[Settings.titleField].sanitizeMermaidTitle();

                return `    ${node.data.id}[${workItemTitle}]`;
            })
            .join('\n');

        dependencyDiagram += '\n' + dependencyGraphNodes
            .flatMap(node => node.parentNodeIndices.map(parentNodeIndex =>
                `    ${dependencyGraphNodes[parentNodeIndex].data.id} --> ${node.data.id}`
            ))
            .join('\n');

        return dependencyDiagram;
    }

    /**
     * Get Azure DevOps Feature child work items gantt diagram.
     * @param {Date} featureStartDate Azure DevOps Feature's start date.
     * @returns Mermaid JS gantt diagram showing a breakdown of Azure DevOps Feature child work
     * items schedule.
     */
    this.getGanttDiagram = function (featureStartDate) {
        const featureStartId = "featureStart";

        let dependencyGraphNodes = dependencyGraph.getNodes();

        let ganttDiagram = "gantt\n    dateFormat YYYY-MM-DD\n    excludes weekends\n"

        ganttDiagram += "    Section Milestones\n";

        ganttDiagram += `    Feature Start : milestone, ${featureStartId}`
            + `, ${getDateString(featureStartDate)}, 1${Settings.effortFieldTimeSpan}\n`;

        ganttDiagram += "    Section Default\n";

        const resourceScheduler = new ResourceScheduler(Settings.resourceCount, featureStartId);

        let scheduledWorkItemIds = [];

        while (scheduledWorkItemIds.length < dependencyGraphNodes.length) {
            const availableResources = resourceScheduler.getAvailableResources();

            const workItemsResources =
                getWorkItemsResources(scheduledWorkItemIds, availableResources);

            workItemsResources.forEach(({ workItem, resource }) => {
                const workItemTitle = workItem.fields[Settings.titleField].sanitizeMermaidTitle();
                const workItemId = workItem.id;
                const workItemEffort = workItem.fields[Settings.effortField];
                const afterWorkItemId = resource.getWorkItemId();

                resource.assignWorkItem(workItemId, workItemEffort);

                ganttDiagram += `        ${workItemTitle} : ${workItemId}, after ${afterWorkItemId}`
                    + `, ${workItemEffort}${Settings.effortFieldTimeSpan}\n`;

                scheduledWorkItemIds.push(workItem.id);
            });

            resourceScheduler.tick();
        }

        return ganttDiagram;
    }

    /**
     * Get a map between ready Azure DevOps Feature child work items and available resources.
     * @param {number[]} scheduledWorkItemIds Azure DevOps Feature child work items identifiers
     * that have already been scheduled.
     * @param {Object[]} availableResources Collection of available resources.
     * @returns Map between ready child work items and available resources.
     */
    const getWorkItemsResources = (scheduledWorkItemIds, availableResources) => {
        const dependencyGraphNodes = dependencyGraph.getNodes();

        return dependencyGraphNodes
            .filter(node => !scheduledWorkItemIds.includes(node.data.id))
            .filter(node => node.parentNodeIndices.every(parentNodeIndex =>
                scheduledWorkItemIds.includes(dependencyGraphNodes[parentNodeIndex].data.id)
            ))
            .map(node => node.data)
            .sort((workItemA, workItemB) => {
                if (workItemA.fields[Settings.priorityField] !== workItemB.fields[Settings.priorityField]) {
                    return workItemA.fields[Settings.priorityField] - workItemB.fields[Settings.priorityField];
                }

                return workItemB.fields[Settings.effortField] - workItemA.fields[Settings.effortField];
            })
            .slice(0, availableResources.length)
            .map((workItem, index) => ({ workItem, resource: availableResources[index] }));
    };
}



/**
 * Get date string from a Date in the format of 'YYYY-MM-DD'.
 * @param {Date} date Input date.
 * @returns {string} Date string in the format of 'YYYY-MM-DD'.
 */
// static #getDateString(date) {
//     const year = date.getFullYear();
//     const month = String(date.getMonth() + 1).padStart(2, '0');
//     const day = String(date.getDate()).padStart(2, '0');

//     return `${year}-${month}-${day}`;
// }