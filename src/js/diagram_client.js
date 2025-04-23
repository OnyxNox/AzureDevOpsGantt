const mermaidRenderOptions = {
    flowchart: { useMaxWidth: true },
    gantt: {
        barGap: 6,
        barHeight: 28,
        fontSize: 14,
        leftPadding: 128,
        rightPadding: 0,
        sectionFontSize: 16,
        useWidth: window.innerWidth,
    },
    securityLevel: "loose",
    startOnLoad: false,
    theme: "dark",
};

mermaid.initialize(mermaidRenderOptions);

window.addEventListener("resize", async () => {
    // `useMaxWidth` is a base diagram option but it doesn't work on the gantt diagram type.
    mermaidRenderOptions.gantt.useWidth = window.innerWidth;

    mermaid.initialize(mermaidRenderOptions);

    if (Settings.actionBar.diagramType === DiagramType.Gantt) {
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
                    workItemRelation.attributes.name === Settings.environment.dependencyRelation)
                .map(dependencyWorkItemRelation =>
                    ControlPanel.getWorkItemIdFromUrl(dependencyWorkItemRelation.url))
                .map(dependencyWorkItemId => workItems
                    .find(workItem => workItem.id === dependencyWorkItemId));

            workItem.fields[Settings.environment.effortField] = workItem.fields[Settings.environment.effortField]
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
                const workItemTitle = DiagramClient.#sanitizeMermaidTitle(
                    node.workItem.fields[Constants.azure_dev_ops.WORK_ITEM_TITLE_FIELD]);

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
        const defaultWorkItemSection = "Default";
        const featureStartId = "featureStart";

        let completedWorkItems = [];
        let scheduledWorkItems = [];
        let ganttLines = new Map();

        ganttLines.set(
            Constants.azure_dev_ops.MILESTONE_SECTION_TAG,
            [`Feature Start : milestone, ${featureStartId}`
                + `, ${DiagramClient.#getDateString(new Date(featureStartDate))}, 1d`]);

        let lastCompletedWorkItemId = featureStartId;
        while (completedWorkItems.length < this.#dependencyGraphNodes.length) {
            const availableResourceCount = Settings.actionBar.resourceCount - scheduledWorkItems.length;

            let readyToScheduleWorkItems = this
                .#getReadyToScheduleWorkItems(scheduledWorkItems, completedWorkItems)
                .slice(0, availableResourceCount);

            readyToScheduleWorkItems.forEach(workItem => {
                const workItemSection = DiagramClient.#sanitizeMermaidTitle(workItem
                    .fields[Constants.azure_dev_ops.WORK_ITEM_TAGS_FIELD]
                    ?.split(';')
                    .find(tag => tag.startsWith(Settings.environment.tagSectionPrefix))
                    ?.replace(Settings.environment.tagSectionPrefix, '')
                    ?? defaultWorkItemSection);
                const workItemTitle = DiagramClient.#sanitizeMermaidTitle(
                    workItem.fields[Constants.azure_dev_ops.WORK_ITEM_TITLE_FIELD]);

                const sectionGanttLines = ganttLines.get(workItemSection) ?? [];

                sectionGanttLines.push(`${workItemTitle} : ${workItem.id}`
                    + `, after ${lastCompletedWorkItemId}`
                    + `, ${workItem.fields[Settings.environment.effortField]}${Settings.environment.effortFieldUnits}`);

                ganttLines.set(workItemSection, sectionGanttLines);

                scheduledWorkItems.push(workItem);
            });

            const leastScheduledEffortRemaining = Math.min(
                ...scheduledWorkItems.map(workItem => workItem.fields[Settings.environment.effortField]));

            scheduledWorkItems.forEach(workItem =>
                workItem.fields[Settings.environment.effortField] -= leastScheduledEffortRemaining);

            const iterationCompletedWorkItems = scheduledWorkItems
                .filter(workItem => workItem.fields[Settings.environment.effortField] <= 0);

            completedWorkItems.push(...iterationCompletedWorkItems);

            scheduledWorkItems = scheduledWorkItems
                .filter(workItem => workItem.fields[Settings.environment.effortField] > 0);

            lastCompletedWorkItemId = iterationCompletedWorkItems[0].id;
        }

        let ganttDiagram =
            "gantt\n    dateFormat YYYY-MM-DD\n    excludes weekends\n    todayMarker off\n";

        ganttDiagram += Array.from(ganttLines.entries())
            .sort(([sectionTitleA, _sectionLinesA], [sectionTitleB, _sectionLinesB]) => {
                if (sectionTitleA === Constants.azure_dev_ops.MILESTONE_SECTION_TAG) return -1;
                if (sectionTitleB === Constants.azure_dev_ops.MILESTONE_SECTION_TAG) return 1;

                if (sectionTitleA === defaultWorkItemSection) return 1;
                if (sectionTitleB === defaultWorkItemSection) return -1;

                return sectionTitleA
                    .localeCompare(sectionTitleB, undefined, { sensitivity: "base" });
            })
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

    /**
     * Get collection of Azure DevOps work items that are ready to be scheduled. Work items are
     * ordered by priority ascending (1..n) then effort descending (n..1).
     * @param {Object[]} scheduledWorkItems Azure DevOps work items that have already been
     * scheduled.
     * @param {Object[]} completedWorkItems Azure DevOps work items that have already been scheduled
     * then completed by a resource.
     * @returns Collection of Azure DevOps work items that are ready to be scheduled.
     */
    #getReadyToScheduleWorkItems(scheduledWorkItems, completedWorkItems) {
        return this.#dependencyGraphNodes
            .filter(node => !(scheduledWorkItems.includes(node.workItem)
                || completedWorkItems.includes(node.workItem)))
            .filter(node => node.parentWorkItems.every(parentWorkItem =>
                completedWorkItems.includes(parentWorkItem)
            ))
            .map(node => node.workItem)
            .sort((workItemA, workItemB) => {
                if (workItemA.fields[Settings.environment.priorityField] !== workItemB.fields[Settings.environment.priorityField]) {
                    return workItemA.fields[Settings.environment.priorityField] - workItemB.fields[Settings.environment.priorityField];
                }

                return workItemB.fields[Settings.environment.effortField] - workItemA.fields[Settings.environment.effortField];
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