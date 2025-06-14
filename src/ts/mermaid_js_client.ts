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
        workItemTypeStateMap: Record<string, IWorkItemTypeState[]>,
        workItemUpdates: any) {
        this.featureStartDate = featureStartDate;

        const workItemStateDateRangesMap =
            MermaidJsClient.getWorkItemsStateDateRangesMap(workItemUpdates);

        workItems.forEach(workItem => {
            const parentWorkItems = workItem
                .relations
                .filter((workItemRelation: IWorkItemRelation) =>
                    workItemRelation.attributes.name === Settings.environment.dependencyRelation)
                .map((dependencyWorkItemRelation: IWorkItemRelation) =>
                    AzureDevOpsClient.getWorkItemIdFromUrl(dependencyWorkItemRelation.url))
                .map((dependencyWorkItemId: number) =>
                    workItems.find((workItem: IWorkItem) => workItem.id === dependencyWorkItemId));

            const workItemEffort = workItem.fields[Settings.environment.effortField];
            workItem.fields[AdogField.WorkingEffort] = isNaN(workItemEffort)
                ? Settings.userInterface.defaultEffort
                : workItemEffort;

            workItem.fields[Settings.environment.effortField]
                = workItem.fields[AdogField.WorkingEffort];

            workItem.fields[AdogField.StateDurationMap] = workItemStateDateRangesMap[workItem.id];

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

    /**
     * Get a map of work item state date ranges.
     */
    private static getWorkItemsStateDateRangesMap(workItemUpdatesMap: any): Record<number, any> {
        const asOf = new Date(Settings.userInterface.asOf || Date.now()).toISOString();

        return workItemUpdatesMap
            // Flatten work item updates, keeping only those with a StateChangeDate field.
            .flatMap(({ value }) => value
                .filter(({ fields }) => fields?.[AdoField.StateChangeDate])
                .map(({ fields, workItemId }) => ({
                    state: fields[AdoField.State].newValue,
                    stateChangeDate: { ...fields[AdoField.StateChangeDate] },
                    workItemId,
                })))
            // Sort updates by workItemId ascending, then by start date (oldValue) descending.
            .sort((workItemUpdateA, workItemUpdateB) =>
                workItemUpdateA.workItemId !== workItemUpdateB.workItemId
                    ? workItemUpdateA.workItemId - workItemUpdateB.workItemId
                    : new Date(workItemUpdateB.stateChangeDate.oldValue).getTime() - new Date(workItemUpdateA.stateChangeDate.oldValue).getTime()
            )
            // Construct date ranges, by setting each update's start date to its new value and its
            // end date to the next update's new value (when the workItemId matches) or to the asOf
            // date if no subsequent update exists.
            .map((workItemUpdate, updateIndex, sortedWorkItemUpdates) => ({
                ...workItemUpdate,
                stateChangeDate: {
                    oldValue: workItemUpdate.stateChangeDate.newValue,
                    newValue: sortedWorkItemUpdates[updateIndex + 1]?.workItemId === workItemUpdate.workItemId
                        ? sortedWorkItemUpdates[updateIndex + 1].stateChangeDate.newValue
                        : asOf,
                },
            }))
            // Group state change dates by their workItemId and state.
            .reduce((workItemsStateDateRangesMap, { state, stateChangeDate, workItemId }) => {
                (workItemsStateDateRangesMap[workItemId] ??= {})[state] ??= [];

                workItemsStateDateRangesMap[workItemId][state].push({
                    startDate: stateChangeDate.oldValue,
                    endDate: stateChangeDate.newValue,
                });

                return workItemsStateDateRangesMap;
            }, {});
    }

    private static async renderDiagramSvg(diagram: string): Promise<HTMLElement> {
        const mermaidJsDiagramWrapper = document.getElementById("mermaidJsDiagramOutput")!;

        const { svg, bindFunctions } = await window.mermaid.render("mermaidJsDiagram", diagram)

        mermaidJsDiagramWrapper.innerHTML = svg;

        bindFunctions?.(mermaidJsDiagramWrapper);

        return mermaidJsDiagramWrapper;
    }

    private calculateWorkItemsActualStartEndDates() {
        const completedWorkItems: IWorkItem[] = [];
        let scheduledWorkItems: IWorkItem[] = [];

        const asOf = new Date(Settings.userInterface.asOf || Date.now());

        let earliestWorkItemEndDate = this.featureStartDate;

        const readyToScheduleWorkItems =
            this.getReadyToScheduleWorkItems(scheduledWorkItems, completedWorkItems);

        readyToScheduleWorkItems.forEach(workItem => {
            const stateDurationMap = Object.entries(workItem.fields[AdogField.StateDurationMap] || {})
                .reduce((stateDurationMap, [state, dateRanges]) => {
                    const dateRangeDuration = (dateRanges as any[]).reduce((sum, { startDate, endDate }) => {
                        const rangeStart = new Date(startDate);
                        const rangeEnd = new Date(endDate);
                        const clampedStart = rangeStart < earliestWorkItemEndDate ? earliestWorkItemEndDate : rangeStart;
                        const clampedEnd = rangeEnd;

                        if (clampedEnd > clampedStart) {
                            const msPerDay = 24 * 60 * 60 * 1000;
                            const start = clampedStart.setHours(0, 0, 0, 0);
                            const end = clampedEnd.setHours(0, 0, 0, 0);
                            const totalDays = Math.ceil((end - start) / msPerDay);
                            const weeks = Math.floor(totalDays / 7);
                            const extraDays = totalDays % 7;
                            const startDay = clampedStart.getDay();
                            // Calculate business days in the extra days
                            const businessDaysInExtra = Math.max(
                                [0, 1, 2, 3, 4, 5, 6]
                                    .slice(startDay, startDay + extraDays)
                                    .filter(d => d !== 0 && d !== 6).length
                                , 0);
                            const duration = weeks * 5 + businessDaysInExtra;
                            return sum + duration;
                        }

                        return sum;
                    }, 0);

                    stateDurationMap[state] ??= 0;
                    stateDurationMap[state] += dateRangeDuration;

                    return stateDurationMap;
                }, {});

            const actualEffortll = Object.entries(stateDurationMap).forEach(([state, duration]) => {
                console.log(state, duration);
            });

            console.log(actualEffortll);

            const actualEffort = workItem.fields[AdogField.WorkingEffort] > stateDurationMap
                ? workItem.fields[AdogField.WorkingEffort] : stateDurationMap;

            const actualEndDate = earliestWorkItemEndDate.addBusinessDays(actualEffort);

            if (stateDurationMap === 0) {
                console.log("actualStartDate Set");
            }

            workItem.fields[AdogField.ActualStartDate] = earliestWorkItemEndDate;

            workItem.fields[AdogField.ActualEndDate] = actualEndDate;

            scheduledWorkItems.push(workItem);
        });
    }

    private calculateWorkItemsProjectedStartEndDates() { }

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