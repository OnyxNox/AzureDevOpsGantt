const mermaidRenderOptions = {
    startOnLoad: false,
    theme: "dark",
    flowchart: { useMaxWidth: true },
    gantt: { useWidth: window.innerWidth },
};

mermaid.initialize(mermaidRenderOptions);

window.addEventListener("resize", async () => {
    mermaidRenderOptions.gantt.useWidth = window.innerWidth;

    mermaid.initialize(mermaidRenderOptions);

    if (Settings.selectedDiagramType === DiagramType.Gantt) {
        const ganttDiagram = localStorage.getItem(Constants.localStorage.GANTT_DIAGRAM_KEY);

        document.getElementById(Constants.userInterface.MERMAID_DIAGRAM_OUTPUT_ELEMENT_ID)
            .innerHTML = (await mermaid.render("updatedGraph", ganttDiagram)).svg;
    }
});

/**
 * Client used to generate Mermaid JS diagrams.
 */
class DiagramClient {
    #dependencyGraphNodes = [];

    /**
     * Initialize a new instance of the {@link DiagramClient}.
     * @param {Object[]} workItems Azure DevOps work items to be graphed.
     */
    constructor(workItems) {
        workItems.forEach(workItem => {
            let parentWorkItems = workItem
                .relations
                .filter(workItemRelation =>
                    workItemRelation.attributes.name === Settings.dependencyRelation)
                .map(dependencyWorkItemRelation =>
                    ControlPanel.getWorkItemIdFromUrl(dependencyWorkItemRelation.url))
                .map(dependencyWorkItemId => workItems
                    .find(workItem => workItem.id === dependencyWorkItemId));

            workItem.fields[Settings.effortField] = workItem.fields[Settings.effortField]
                ?? Constants.azure_dev_ops.WORK_ITEM_DEFAULT_EFFORT;

            this.#dependencyGraphNodes.push({ workItem, parentWorkItems });
        });
    }

    /**
     * Get Mermaid JS flowchart showing dependencies hierarchy for the Azure DevOps work items.
     * @returns Mermaid JS flowchart showing a dependency hierarchy diagram.
     */
    getDependencyDiagram() {
        let dependencyDiagram = "flowchart TD\n";

        dependencyDiagram += this.#dependencyGraphNodes
            .map(node => {
                const workItemTitle = DiagramClient
                    .#sanitizeMermaidTitle(node.workItem.fields[Settings.titleField]);

                return `    ${node.workItem.id}[${workItemTitle}]`;
            })
            .join('\n');

        dependencyDiagram += '\n' + this.#dependencyGraphNodes
            .flatMap(node => node.parentWorkItems.map(parentWorkItem =>
                `    ${parentWorkItem.id} --> ${node.workItem.id}`))
            .join('\n');

        return dependencyDiagram;
    }

    /**
     * Get Mermaid JS gantt chart showing a schedule for the Azure DevOps work items.
     * @param {Date} featureStartDate Start date of the Azure DevOps feature.
     * @returns Mermaid JS gantt chart showing a schedule diagram.
     */
    getGanttDiagram(featureStartDate) {
        const featureStartId = "featureStart";

        let completedWorkItems = [];
        let scheduledWorkItems = [];
        let ganttLines = new Map();

        ganttLines.set(
            Constants.azure_dev_ops.MILESTONE_SECTION_TAG,
            [`Feature Start : milestone, ${featureStartId}`
                + `, ${DiagramClient.#getDateString(featureStartDate)}, 1d`]);

        let lastCompletedWorkItemId = featureStartId;
        while (completedWorkItems.length < this.#dependencyGraphNodes.length) {
            let readyToScheduleWorkItems = this
                .#getReadyToScheduleWorkItems(scheduledWorkItems, completedWorkItems)
                .slice(0, Settings.resourceCount);

            readyToScheduleWorkItems.forEach(workItem => {
                const workItemSection = workItem
                    .fields[Constants.azure_dev_ops.WORK_ITEM_TAGS_FIELD]
                    ?.split(';')
                    .find(tag => tag.startsWith(Settings.sectionTagPrefix))
                    .replace(Settings.sectionTagPrefix, '')
                    ?? "Default";
                const workItemTitle = DiagramClient
                    .#sanitizeMermaidTitle(workItem.fields[Settings.titleField]);

                const sectionGanttLines = ganttLines.get(workItemSection) ?? [];

                sectionGanttLines.push(`${workItemTitle} : ${workItem.id}`
                    + `, after ${lastCompletedWorkItemId}`
                    + `, ${workItem.fields[Settings.effortField]}${Settings.effortFieldTimeSpan}`);

                ganttLines.set(workItemSection, sectionGanttLines);

                scheduledWorkItems.push(workItem);
            });

            const leastEffortRemainingScheduledWorkItem = scheduledWorkItems
                .reduce((leastEffortWorkItem, workItem) => {
                    return workItem.fields[Settings.effortField] < leastEffortWorkItem.fields[Settings.effortField]
                        ? workItem : leastEffortWorkItem;
                }, scheduledWorkItems[0]);

            scheduledWorkItems
                .forEach(workItem => workItem.fields[Settings.effortField] -= leastEffortRemainingScheduledWorkItem.fields[Settings.effortField]);

            const iterationCompletedWorkItems = scheduledWorkItems.filter(workItem => workItem.fields[Settings.effortField] <= 0);
            completedWorkItems.push(...iterationCompletedWorkItems);

            scheduledWorkItems = scheduledWorkItems.filter(workItem => workItem.fields[Settings.effortField] > 0);

            lastCompletedWorkItemId = iterationCompletedWorkItems[0].id;
        }

        let ganttDiagram = "gantt\n    dateFormat YYYY-MM-DD\n    excludes weekends\n"

        ganttDiagram += Array.from(ganttLines.entries())
            .flatMap(([key, value]) =>
                [`    Section ${key}`].concat(value.map(line => `        ${line}`)))
            .join('\n');

        return ganttDiagram;
    }

    /**
     * Get date string from a Date in the format of 'YYYY-MM-DD'.
     * @param {Date} date Input date.
     * @returns {string} Date string in the format of 'YYYY-MM-DD'.
     */
    static #getDateString(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        return `${year}-${month}-${day}`;
    }

    #getReadyToScheduleWorkItems(scheduledWorkItems, completedWorkItems) {
        return this.#dependencyGraphNodes
            .filter(node => !(scheduledWorkItems.includes(node.workItem)
                || completedWorkItems.includes(node.workItem)))
            .filter(node => node.parentWorkItems.every(parentWorkItem =>
                completedWorkItems.includes(parentWorkItem)
            ))
            .map(node => node.workItem)
            .sort((workItemA, workItemB) => {
                if (workItemA.fields[Settings.priorityField] !== workItemB.fields[Settings.priorityField]) {
                    return workItemA.fields[Settings.priorityField] - workItemB.fields[Settings.priorityField];
                }

                return workItemB.fields[Settings.effortField] - workItemA.fields[Settings.effortField];
            });
    }

    /**
     * Get a valid Mermaid JS diagram node title.
     * @param {string} title Title to be sanitized.
     * @returns Valid Mermaid JS diagram node title, where all non-alphanumeric characters are
     * replaced with their HTML ASCII character codes.
     */
    static #sanitizeMermaidTitle(title) {
        return title.replace(/[^a-zA-Z0-9 ]/g, (char) => `#${char.charCodeAt(0)};`);
    }
}