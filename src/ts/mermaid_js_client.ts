import { AzureDevOpsClient } from "./azure_dev_ops_client";
import { AdoField, AdogField, DiagramType, LocalStorageKey } from "./enums";
import { IWorkItem, IWorkItemRelation, IWorkItemTypeState } from "./interfaces/work_item_interfaces";
import { Settings } from "./settings";

/**
 * Mermaid JS render options.
 */
const mermaidJsRenderOptions = {
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

window.mermaid.initialize(mermaidJsRenderOptions);

window.addEventListener("resize", async () => {
    // `useMaxWidth` is a base diagram option but it doesn't work on the gantt diagram type.
    mermaidJsRenderOptions.gantt.useWidth = window.innerWidth;

    window.mermaid.initialize(mermaidJsRenderOptions);

    if (Settings.userInterface.diagramType === DiagramType.Gantt) {
        const ganttDiagram = localStorage.getItem(LocalStorageKey.GanttDiagram);

        document.getElementById("mermaidJsDiagramOutput")!.innerHTML =
            (await window.mermaid.render("ganttDiagram", ganttDiagram!)).svg;
    }
});

/**
 * Client used to generate Mermaid JS diagrams.
 */
export class MermaidJsClient {
    private dependencyGraphNodes: { workItem: IWorkItem, parentWorkItems: any[] }[] = [];

    private featureStartDate: Date;

    private workItemTypeStateMap: Record<string, IWorkItemTypeState[]>;

    /**
     * Initialize a new instance of the {@link MermaidJsClient}.
     * @param workItems Azure DevOps work items to be graphed.
     */
    public constructor(
        featureStartDate: Date,
        workItems: IWorkItem[],
        workItemTypeStateMap: Record<string, IWorkItemTypeState[]>) {
        this.featureStartDate = featureStartDate;

        workItems.forEach(workItem => {
            const parentWorkItems = workItem
                .relations
                .filter((workItemRelation: IWorkItemRelation) =>
                    workItemRelation.attributes.name === Settings.environment.dependencyRelation)
                .map((dependencyWorkItemRelation: IWorkItemRelation) =>
                    AzureDevOpsClient.getWorkItemIdFromUrl(dependencyWorkItemRelation.url))
                .map((dependencyWorkItemId: number) =>
                    workItems.find((workItem: IWorkItem) => workItem.id === dependencyWorkItemId));

            const effort = workItem.fields[Settings.environment.effortField];

            workItem.fields[AdogField.WorkingEffort] = isNaN(effort)
                ? Settings.userInterface.defaultEffort
                : effort;
            workItem.fields[Settings.environment.effortField]
                = workItem.fields[AdogField.WorkingEffort];

            this.dependencyGraphNodes.push({ workItem, parentWorkItems });
        });

        this.workItemTypeStateMap = workItemTypeStateMap;

        this.calculateWorkItemsProjectedStartEndDates();
        this.calculateWorkItemsActualStartEndDates();
    }

    public getWorkItem(workItemId: number): IWorkItem | undefined {
        return this.dependencyGraphNodes.find(node => node.workItem.id == workItemId)?.workItem;
    }

    /**
     * Get Mermaid JS flowchart showing dependencies hierarchy for the Azure DevOps work items.
     * @returns Mermaid JS flowchart showing a dependency hierarchy diagram.
     */
    public async renderDependencyDiagram(): Promise<HTMLElement> {
        let dependencyDiagram = "flowchart LR\n";

        dependencyDiagram += this.dependencyGraphNodes
            .map(node => {
                const workItemTitle = node.workItem.fields[AdoField.Title].encodeSpecialChars();

                return `    id-${node.workItem.id}[${workItemTitle}]`
                    + `\n    click id-${node.workItem.id} call showWorkItemInfo(${node.workItem.id})`;
            })
            .join('\n');

        dependencyDiagram += '\n' + this.dependencyGraphNodes
            .flatMap(node => node.parentWorkItems.map(parentWorkItem =>
                `    id-${parentWorkItem.id} --> id-${node.workItem.id}`))
            .join('\n');

        return await MermaidJsClient.renderDiagramSvg(dependencyDiagram);
    }

    /**
     * Get Mermaid JS gantt chart showing a schedule for the Azure DevOps work items.
     * @returns Mermaid JS gantt chart showing a schedule diagram.
     */
    public async renderGanttDiagram(): Promise<HTMLElement> {
        const defaultSection = "Default";

        const workItemsBySection = this.dependencyGraphNodes
            .map(node => node.workItem)
            .groupBy(workItem => workItem.fields["System.Tags"]?.split(';')
                .find((tag: string) => tag.startsWith(Settings.environment.tagSectionPrefix))
                ?.replace(Settings.environment.tagSectionPrefix, '') ?? defaultSection);

        let ganttDiagram =
            "gantt\n    dateFormat YYYY-MM-DD\n    excludes weekends\n    todayMarker off\n";

        ganttDiagram += Object.entries(workItemsBySection)
            .sort(([sectionA], [sectionB]) => {
                if (sectionA === defaultSection) return 1;
                if (sectionB === defaultSection) return -1;

                return sectionA
                    .localeCompare(sectionB, undefined, { sensitivity: "base" });
            })
            .map(([section, workItems]): [string, IWorkItem[]] => {
                const sortedWorkItems = workItems.sort((workItemA, workItemB) =>
                    workItemA.fields[AdogField.ProjectedStartDate] - workItemB.fields[AdogField.ProjectedStartDate]);

                return [section, sortedWorkItems];
            })
            .flatMap(([section, workItems]) =>
                [`    Section ${section.encodeSpecialChars()}`].concat(workItems.map(workItem => {
                    const title = workItem.fields[AdoField.Title].encodeSpecialChars();
                    const startDate = workItem.fields[AdogField.ProjectedStartDate].toISODateString();
                    const effort = workItem.fields[Settings.environment.effortField] + Settings.environment.effortFieldUnits;

                    const workItemLine = `${title} : id-${workItem.id}, ${startDate}, ${effort}`;
                    const interactionLine = `click id-${workItem.id} call showWorkItemInfo(${workItem.id})`;

                    return `        ${workItemLine}\n        ${interactionLine}`;
                })))
            .join('\n');

        const ganttDiagramSvg = await MermaidJsClient.renderDiagramSvg(ganttDiagram);

        Object.entries(this.workItemTypeStateMap).forEach(([workItemType, workItemTypeStates]) => {
            workItemTypeStates.forEach(workItemTypeState => {
                ganttDiagramSvg.querySelector("style")!.textContent +=
                    `.workItemState-${workItemType.titleToCamelCase()}-${workItemTypeState.name.titleToCamelCase()} { fill: #${workItemTypeState.color} !important; stroke: #${workItemTypeState.color} !important; }`;
            });
        });

        this.dependencyGraphNodes.forEach(node => {
            const workItemType = node.workItem.fields["System.WorkItemType"].titleToCamelCase();
            const workItemState = node.workItem.fields["System.State"].titleToCamelCase();

            ganttDiagramSvg.querySelector(`g>rect#id-${node.workItem.id}`)
                ?.classList
                .add(`workItemState-${workItemType}-${workItemState}`);
        });

        return ganttDiagramSvg;
    }

    private static async renderDiagramSvg(diagram: string): Promise<HTMLElement> {
        const mermaidJsDiagramWrapper = document.getElementById("mermaidJsDiagramOutput")!;

        const { svg, bindFunctions } = await window.mermaid.render("mermaidJsDiagram", diagram)

        mermaidJsDiagramWrapper.innerHTML = svg;

        bindFunctions?.(mermaidJsDiagramWrapper);

        return mermaidJsDiagramWrapper;
    }

    private calculateWorkItemsActualStartEndDates() {
        // Brainstorming:
        // "New (To Do) (First)" does not increase effort.
        // "Removed / Done (2x Last)" does not increase effort but may reduce it when actual effort is less than the projected effort.
        // "In Progress (Active) & Blocked" increases effort when actual effort is more than the projected effort.
        // Each work item is "scheduled" and "completed" like in the Projected Start & End calculation.

        const completedWorkItems: IWorkItem[] = [];
        let scheduledWorkItems: IWorkItem[] = [];

        let earliestWorkItemProjectedEndDate = this.featureStartDate;
        while (completedWorkItems.length < this.dependencyGraphNodes.length) {
            const availableResourceCount = Settings.userInterface.resourceCount - scheduledWorkItems.length;

            const readyToScheduleWorkItems = this
                .getReadyToScheduleWorkItems(scheduledWorkItems, completedWorkItems)
                .slice(0, availableResourceCount);

            readyToScheduleWorkItems.forEach(workItem => {
                workItem.fields[AdogField.ProjectedStartDate] = earliestWorkItemProjectedEndDate;

                workItem.fields[AdogField.ProjectedEndDate] = earliestWorkItemProjectedEndDate
                    .addBusinessDays(workItem.fields[AdogField.WorkingEffort] - 1);

                scheduledWorkItems.push(workItem);
            });

            const leastScheduledEffortRemaining = Math.min(
                ...scheduledWorkItems.map(workItem => workItem.fields[AdogField.WorkingEffort]));

            scheduledWorkItems.forEach(workItem =>
                workItem.fields[AdogField.WorkingEffort] -= leastScheduledEffortRemaining);

            const iterationCompletedWorkItems = scheduledWorkItems
                .filter(workItem => workItem.fields[AdogField.WorkingEffort] <= 0);

            iterationCompletedWorkItems.forEach(workItem =>
                workItem.fields[AdogField.WorkingEffort] = workItem.fields[Settings.environment.effortField]);

            completedWorkItems.push(...iterationCompletedWorkItems);

            scheduledWorkItems = scheduledWorkItems
                .filter(workItem => workItem.fields[AdogField.WorkingEffort] > 0);

            earliestWorkItemProjectedEndDate = iterationCompletedWorkItems[0]
                .fields[AdogField.ProjectedEndDate]
                .addBusinessDays(1);
        }
    }

    private calculateWorkItemsProjectedStartEndDates() {
        const completedWorkItems: IWorkItem[] = [];
        let scheduledWorkItems: IWorkItem[] = [];

        let earliestWorkItemProjectedEndDate = this.featureStartDate;
        while (completedWorkItems.length < this.dependencyGraphNodes.length) {
            const availableResourceCount = Settings.userInterface.resourceCount - scheduledWorkItems.length;

            const readyToScheduleWorkItems = this
                .getReadyToScheduleWorkItems(scheduledWorkItems, completedWorkItems)
                .slice(0, availableResourceCount);

            readyToScheduleWorkItems.forEach(workItem => {
                workItem.fields[AdogField.ProjectedStartDate] = earliestWorkItemProjectedEndDate;

                workItem.fields[AdogField.ProjectedEndDate] = earliestWorkItemProjectedEndDate
                    .addBusinessDays(workItem.fields[AdogField.WorkingEffort] - 1);

                scheduledWorkItems.push(workItem);
            });

            const leastScheduledEffortRemaining = Math.min(
                ...scheduledWorkItems.map(workItem => workItem.fields[AdogField.WorkingEffort]));

            scheduledWorkItems.forEach(workItem =>
                workItem.fields[AdogField.WorkingEffort] -= leastScheduledEffortRemaining);

            const iterationCompletedWorkItems = scheduledWorkItems
                .filter(workItem => workItem.fields[AdogField.WorkingEffort] <= 0);

            completedWorkItems.push(...iterationCompletedWorkItems);

            scheduledWorkItems = scheduledWorkItems
                .filter(workItem => workItem.fields[AdogField.WorkingEffort] > 0);

            earliestWorkItemProjectedEndDate = iterationCompletedWorkItems[0]
                .fields[AdogField.ProjectedEndDate]
                .addBusinessDays(1);
        }
    }

    /**
     * Get collection of Azure DevOps work items that are ready to be scheduled.
     * Work items are ordered by priority ascending (1..n) then effort descending (n..1).
     * @param scheduledWorkItems Azure DevOps work items that have already been scheduled.
     * @param completedWorkItems Azure DevOps work items that have already been completed.
     * @returns Collection of Azure DevOps work items that are ready to be scheduled.
     */
    private getReadyToScheduleWorkItems(scheduledWorkItems: IWorkItem[], completedWorkItems: IWorkItem[]): IWorkItem[] {
        return this.dependencyGraphNodes
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
}