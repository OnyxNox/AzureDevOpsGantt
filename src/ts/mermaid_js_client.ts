import { AzureDevOpsClient } from "./azure_dev_ops_client";
import { DiagramType, LocalStorageKey } from "./enums";
import { IMermaidJsRenderOptions } from "./interfaces";
import { IWorkItem, IWorkItemRelation, IWorkItemTypeState } from "./interfaces/work_item_interfaces";
import { Settings } from "./settings";

/**
 * Mermaid JS render options.
 */
const mermaidJsRenderOptions: IMermaidJsRenderOptions = {
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
    private static readonly PROJECTED_END_DATE_FIELD_NAME: string = "ADOG.ProjectedEndDate";

    private static readonly PROJECTED_START_DATE_FIELD_NAME: string = "ADOG.ProjectedStartDate";

    private static readonly WORKING_EFFORT_FIELD_NAME: string = "ADOG.WorkingEffort";

    private dependencyGraphNodes: { workItem: any, parentWorkItems: any[] }[] = [];

    private featureStartDate: Date;

    private workItemTypeStateMap: Record<string, IWorkItemTypeState[]>;

    /**
     * Initialize a new instance of the {@link MermaidJsClient}.
     * @param workItems Azure DevOps work items to be graphed.
     */
    constructor(
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

            workItem.fields[MermaidJsClient.WORKING_EFFORT_FIELD_NAME] = isNaN(effort)
                ? Settings.userInterface.defaultEffort
                : effort;
            workItem.fields[Settings.environment.effortField]
                = workItem.fields[MermaidJsClient.WORKING_EFFORT_FIELD_NAME];

            this.dependencyGraphNodes.push({ workItem, parentWorkItems });
        });

        this.workItemTypeStateMap = workItemTypeStateMap;

        this.calculateWorkItemStartEndDates();
    }

    getWorkItem(workItemId: number): IWorkItem {
        return this.dependencyGraphNodes.find(node => node.workItem.id == workItemId)?.workItem;
    }

    /**
     * Get Mermaid JS flowchart showing dependencies hierarchy for the Azure DevOps work items.
     * @returns Mermaid JS flowchart showing a dependency hierarchy diagram.
     */
    async renderDependencyDiagram(): Promise<HTMLElement> {
        let dependencyDiagram = "flowchart LR\n";

        dependencyDiagram += this.dependencyGraphNodes
            .map(node => {
                const workItemTitle = node.workItem.fields["System.Title"].encodeSpecialChars();

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
     * @param featureStartDate Start date of the Azure DevOps feature.
     * @returns Mermaid JS gantt chart showing a schedule diagram.
     */
    async renderGanttDiagram(): Promise<HTMLElement> {
        const defaultWorkItemSection = "Default";
        const featureStartId = "featureStart";

        const ganttSections = new Map<string, string[]>();

        ganttSections.set(
            "Milestone",
            [`Feature Start : milestone, id-${featureStartId}`
                + `, ${MermaidJsClient.getDateString(new Date(this.featureStartDate))}, 1d`]);

        const groupedWorkItems = this.dependencyGraphNodes
            .map(node => node.workItem)
            .groupBy(workItem => workItem.fields[MermaidJsClient.PROJECTED_START_DATE_FIELD_NAME].toISOString().split("T")[0]);

        let lastCompletedWorkItemId = featureStartId;
        Object.entries(groupedWorkItems)
            .sort()
            .forEach(([_projectedStartDate, workItems]) => {
                workItems.forEach(workItem => {
                    const workItemSection = (workItem
                        .fields["System.Tags"]
                        ?.split(';')
                        .find((tag: string) => tag.startsWith(Settings.environment.tagSectionPrefix))
                        ?.replace(Settings.environment.tagSectionPrefix, '')
                        ?? defaultWorkItemSection).encodeSpecialChars();;
                    const workItemTitle = workItem.fields["System.Title"].encodeSpecialChars();

                    const sectionGanttLines = ganttSections.get(workItemSection) ?? [];

                    sectionGanttLines.push(`${workItemTitle} : id-${workItem.id}`
                        + `, after id-${lastCompletedWorkItemId}`
                        + `, ${workItem.fields[Settings.environment.effortField]}${Settings.environment.effortFieldUnits}`);

                    ganttSections.set(workItemSection, sectionGanttLines);
                });

                lastCompletedWorkItemId = workItems.reduce((min, workItem) => workItem.fields[Settings.environment.effortField] < min.fields[Settings.environment.effortField] ? workItem : min, workItems[0]).id;
            });

        let ganttDiagram =
            "gantt\n    dateFormat YYYY-MM-DD\n    excludes weekends\n    todayMarker off\n";

        ganttDiagram += Array.from(ganttSections.entries())
            .sort(([sectionTitleA], [sectionTitleB]) => {
                if (sectionTitleA === "Milestone") return -1;
                if (sectionTitleB === "Milestone") return 1;

                if (sectionTitleA === defaultWorkItemSection) return 1;
                if (sectionTitleB === defaultWorkItemSection) return -1;

                return sectionTitleA
                    .localeCompare(sectionTitleB, undefined, { sensitivity: "base" });
            })
            .flatMap(([key, value]) =>
                [`    Section ${key}`].concat(value.map(line => `        ${line}`)))
            .join('\n');

        const ganttDiagramSvg = await MermaidJsClient.renderDiagramSvg(ganttDiagram);

        Object.entries(this.workItemTypeStateMap).forEach(([workItemType, workItemTypeStates]) => {
            workItemTypeStates.forEach(workItemTypeState => {
                ganttDiagramSvg.querySelector("style")!.textContent +=
                    `.workItemState-${workItemType.titleToCamelCase()}-${workItemTypeState.name.titleToCamelCase()} { fill: #${workItemTypeState.color} !important; stroke: #${workItemTypeState.color} !important; }`;
            });
        });

        this.dependencyGraphNodes.forEach(node => {
            ganttDiagramSvg.querySelector(`g>rect#id-${node.workItem.id}`)
                ?.classList
                .add(`workItemState-${node.workItem.fields["System.WorkItemType"].titleToCamelCase()}-${node.workItem.fields["System.State"].titleToCamelCase()}`);
        });

        return ganttDiagramSvg;
    }

    /**
     * Get date string from a Date in the format of 'YYYY-MM-DD'.
     * @param date Input date.
     * @returns Date string in the format of 'YYYY-MM-DD'.
     */
    private static getDateString(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        return `${year}-${month}-${day}`;
    }

    private static addBusinessDays(date: Date, dayCount: number): Date {
        const newDate = new Date(date);

        while (dayCount > 0) {
            newDate.setDate(newDate.getDate() + 1);

            dayCount -= (newDate.getDay() % 6 !== 0) ? 1 : 0; // Skip weekends (6 = Sat; 0 = Sun)
        }

        return newDate;
    }

    private calculateWorkItemStartEndDates() {
        const completedWorkItems: IWorkItem[] = [];
        let scheduledWorkItems: IWorkItem[] = [];

        let earliestWorkItemProjectedEndDate = this.featureStartDate;
        while (completedWorkItems.length < this.dependencyGraphNodes.length) {
            const availableResourceCount = Settings.userInterface.resourceCount - scheduledWorkItems.length;

            const readyToScheduleWorkItems = this
                .getReadyToScheduleWorkItems(scheduledWorkItems, completedWorkItems)
                .slice(0, availableResourceCount);

            readyToScheduleWorkItems.forEach(workItem => {
                workItem.fields[MermaidJsClient.PROJECTED_START_DATE_FIELD_NAME] = earliestWorkItemProjectedEndDate;

                workItem.fields[MermaidJsClient.PROJECTED_END_DATE_FIELD_NAME] = MermaidJsClient
                    .addBusinessDays(earliestWorkItemProjectedEndDate, workItem.fields[MermaidJsClient.WORKING_EFFORT_FIELD_NAME]);

                scheduledWorkItems.push(workItem);
            });

            const leastScheduledEffortRemaining = Math.min(
                ...scheduledWorkItems.map(workItem => workItem.fields[MermaidJsClient.WORKING_EFFORT_FIELD_NAME]));

            scheduledWorkItems.forEach(workItem =>
                workItem.fields[MermaidJsClient.WORKING_EFFORT_FIELD_NAME] -= leastScheduledEffortRemaining);

            const iterationCompletedWorkItems = scheduledWorkItems
                .filter(workItem => workItem.fields[MermaidJsClient.WORKING_EFFORT_FIELD_NAME] <= 0);

            completedWorkItems.push(...iterationCompletedWorkItems);

            scheduledWorkItems = scheduledWorkItems
                .filter(workItem => workItem.fields[MermaidJsClient.WORKING_EFFORT_FIELD_NAME] > 0);

            earliestWorkItemProjectedEndDate = iterationCompletedWorkItems[0].fields[MermaidJsClient.PROJECTED_END_DATE_FIELD_NAME];
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

    private static async renderDiagramSvg(diagram: string): Promise<HTMLElement> {
        const mermaidJsDiagramWrapper = document.getElementById("mermaidJsDiagramOutput")!;

        const { svg, bindFunctions } = await window.mermaid.render("mermaidJsDiagram", diagram)

        mermaidJsDiagramWrapper.innerHTML = svg;

        bindFunctions?.(mermaidJsDiagramWrapper);

        return mermaidJsDiagramWrapper;
    }
}