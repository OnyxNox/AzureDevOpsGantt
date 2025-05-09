import { AzureDevOpsClient } from "./azure_dev_ops_client";
import { DiagramType, LocalStorageKey } from "./enums";
import { IMermaidJsRenderOptions } from "./interfaces";
import { Settings } from "./settings";
import { titleToCamelCase } from "./utility";

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

mermaid.initialize(mermaidJsRenderOptions);

window.addEventListener("resize", async () => {
    // `useMaxWidth` is a base diagram option but it doesn't work on the gantt diagram type.
    mermaidJsRenderOptions.gantt.useWidth = window.innerWidth;

    mermaid.initialize(mermaidJsRenderOptions);

    if (Settings.userInterface.diagramType === DiagramType.Gantt) {
        const ganttDiagram = localStorage.getItem(LocalStorageKey.GanttDiagram);

        document.getElementById("mermaidJsDiagramOutput")!.innerHTML =
            (await mermaid.render("ganttDiagram", ganttDiagram!)).svg;
    }
});

/**
 * Client used to generate Mermaid JS diagrams.
 */
export class MermaidJsClient {
    private dependencyGraphNodes: { workItem: any, parentWorkItems: any[] }[] = [];

    /**
     * Initialize a new instance of the {@link MermaidJsClient}.
     * @param workItems Azure DevOps work items to be graphed.
     */
    constructor(workItems: any[]) {
        workItems.forEach(workItem => {
            const parentWorkItems = workItem
                .relations
                .filter((workItemRelation: any) =>
                    workItemRelation.attributes.name === Settings.environment.dependencyRelation)
                .map((dependencyWorkItemRelation: any) =>
                    AzureDevOpsClient.getWorkItemIdFromUrl(dependencyWorkItemRelation.url))
                .map((dependencyWorkItemId: number) =>
                    workItems.find((workItem: any) => workItem.id === dependencyWorkItemId));

            workItem.fields[Settings.environment.effortField] = isNaN(workItem.fields[Settings.environment.effortField])
                ? Settings.userInterface.defaultEffort
                : workItem.fields[Settings.environment.effortField];

            this.dependencyGraphNodes.push({ workItem, parentWorkItems });
        });
    }

    /**
     * Get Mermaid JS flowchart showing dependencies hierarchy for the Azure DevOps work items.
     * @returns Mermaid JS flowchart showing a dependency hierarchy diagram.
     */
    async getDependencyDiagram(): Promise<HTMLElement> {
        let dependencyDiagram = "flowchart LR\n";

        dependencyDiagram += this.dependencyGraphNodes
            .map(node => {
                const workItemTitle = MermaidJsClient.sanitizeMermaidTitle(
                    node.workItem.fields["System.Title"]);

                return `    ${node.workItem.id}[${workItemTitle}]`;
            })
            .join('\n');

        dependencyDiagram += '\n' + this.dependencyGraphNodes
            .flatMap(node => node.parentWorkItems.map(parentWorkItem =>
                `    ${parentWorkItem.id} --> ${node.workItem.id}`))
            .join('\n');

        return await MermaidJsClient
            .renderDiagramSvg("dependencyDiagram", dependencyDiagram);
    }

    /**
     * Get Mermaid JS gantt chart showing a schedule for the Azure DevOps work items.
     * @param featureStartDate Start date of the Azure DevOps feature.
     * @returns Mermaid JS gantt chart showing a schedule diagram.
     */
    async getGanttDiagram(featureStartDate: Date, workItemStates: any[]): Promise<HTMLElement> {
        const defaultWorkItemSection = "Default";
        const featureStartId = "featureStart";

        const completedWorkItems: any[] = [];
        let scheduledWorkItems: any[] = [];
        const ganttLines = new Map<string, string[]>();

        ganttLines.set(
            "Milestone",
            [`Feature Start : milestone, id-${featureStartId}`
                + `, ${MermaidJsClient.getDateString(new Date(featureStartDate))}, 1d`]);

        let lastCompletedWorkItemId = featureStartId;
        while (completedWorkItems.length < this.dependencyGraphNodes.length) {
            const availableResourceCount = Settings.userInterface.resourceCount - scheduledWorkItems.length;

            const readyToScheduleWorkItems = this
                .getReadyToScheduleWorkItems(scheduledWorkItems, completedWorkItems)
                .slice(0, availableResourceCount);

            readyToScheduleWorkItems.forEach(workItem => {
                const workItemSection = MermaidJsClient.sanitizeMermaidTitle(workItem
                    .fields["System.Tags"]
                    ?.split(';')
                    .find((tag: string) => tag.startsWith(Settings.environment.tagSectionPrefix))
                    ?.replace(Settings.environment.tagSectionPrefix, '')
                    ?? defaultWorkItemSection);
                const workItemTitle = MermaidJsClient.sanitizeMermaidTitle(
                    workItem.fields["System.Title"]);

                const sectionGanttLines = ganttLines.get(workItemSection) ?? [];

                sectionGanttLines.push(`${workItemTitle} : id-${workItem.id}`
                    + `, after id-${lastCompletedWorkItemId}`
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

        const ganttDiagramSvg = await MermaidJsClient
            .renderDiagramSvg("ganttDiagram", ganttDiagram);

        workItemStates.forEach(workItemState => {
            ganttDiagramSvg.querySelector("style")!.textContent += `.workItemState-${titleToCamelCase(workItemState.name)} { fill: #${workItemState.color} !important; stroke: #${workItemState.color} !important; }`;
        });

        this.dependencyGraphNodes.forEach(node => {
            ganttDiagramSvg.querySelector(`g>rect#id-${node.workItem.id}`)
                ?.classList
                .add("workItemState-" + titleToCamelCase(node.workItem.fields["System.State"]));
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

    /**
     * Get collection of Azure DevOps work items that are ready to be scheduled.
     * Work items are ordered by priority ascending (1..n) then effort descending (n..1).
     * @param scheduledWorkItems Azure DevOps work items that have already been scheduled.
     * @param completedWorkItems Azure DevOps work items that have already been completed.
     * @returns Collection of Azure DevOps work items that are ready to be scheduled.
     */
    private getReadyToScheduleWorkItems(scheduledWorkItems: any[], completedWorkItems: any[]): any[] {
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

    private static async renderDiagramSvg(diagramId: string, diagram: string): Promise<HTMLElement> {
        return new DOMParser()
            .parseFromString((await mermaid.render(diagramId, diagram)).svg, "image/svg+xml")
            .documentElement;
    }

    /**
     * Get a valid Mermaid JS diagram node title.
     * @param title Title to be sanitized.
     * @returns Valid Mermaid JS diagram node title.
     */
    private static sanitizeMermaidTitle(title: string): string {
        return title.replace(/[^a-zA-Z0-9 ]/g, (char) => `#${char.charCodeAt(0)};`);
    }
}