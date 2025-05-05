/**
 * Mermaid JS diagram type.
 */
export enum DiagramType {
    /**
     * Flowchart showing a dependency hierarchy diagram.
     */
    Dependency = "dependency",

    /**
     * Gantt chart showing a schedule diagram.
     */
    Gantt = "gantt",
}

/**
 * Azure DevOps effort field unit of measure.
 */
export enum EffortUnit {
    /**
     * Effort field is measured in days.
     */
    Days = 'd',

    /**
     * Effort field is measured in weeks.
     */
    Weeks = 'w',
}

/**
 * Web browser local storage key.
 */
export enum LocalStorageKey {
    /**
     * Dependency hierarchy diagram local storage key.
     */
    DependencyDiagram = "dependencyDiagram",

    /**
     * Schedule diagram local storage key.
     */
    GanttDiagram = "ganttDiagram",

    /**
     * Session settings local storage key.
     */
    Settings = "settings",
}