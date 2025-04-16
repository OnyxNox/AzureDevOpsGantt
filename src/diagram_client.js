/**
 * Client used to generate Mermaid JS diagrams.
 * @param {Object} dependencyGraph Dependency graph used to describe Azure DevOps Feature child work
 * items dependency structure.
 */
function DiagramClient(dependencyGraph) {
    /**
     * Get Azure DevOps Feature child work items dependency diagram.
     */
    this.getDependencyDiagram = function () {
        let dependencyGraphNodes = dependencyGraph.getNodes();

        let dependencyDiagram = "flowchart TD\n";

        dependencyDiagram += dependencyGraphNodes
            .map(node => {
                const workItemTitle = node
                    .data
                    .fields[Settings.titleField]
                    .sanitizeMermaidTitle();

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
     */
    this.getGanttDiagram = function (featureStartDate) {
        let dependencyGraphNodes = dependencyGraph.getNodes();

        let ganttDiagram = "gantt\n    dateFormat YYYY-MM-DD\n    excludes weekends\n"

        ganttDiagram += "    Section Milestones\n";

        ganttDiagram += `    Feature Start : milestone, featureStart`
            + `, ${getDateString(featureStartDate)}, 1${Settings.effortFieldTimeSpan}\n`;

        ganttDiagram += "    Section Default\n";

        let scheduledWorkItemIds = [];

        while (scheduledWorkItemIds.length < dependencyGraphNodes.length) {
            let workItemsToBeScheduled = dependencyGraphNodes
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
                });

            workItemsToBeScheduled.forEach(workItemToBeScheduled => {
                const workItemTitle = workItemToBeScheduled
                    .fields[Settings.titleField]
                    .sanitizeMermaidTitle();
                const workItemEffort = workItemToBeScheduled.fields[Settings.effortField];

                ganttDiagram += `    ${workItemTitle} : ${workItemEffort}`
                    + `${Settings.effortFieldTimeSpan}\n`;

                scheduledWorkItemIds.push(workItemToBeScheduled.id);
            });
        }

        return ganttDiagram;
    }
}