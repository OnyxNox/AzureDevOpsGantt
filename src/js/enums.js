/**
 * Mermaid JS diagram type enumeration.
 */
const DiagramType = Object.freeze({
    /**
     * Mermaid JS flowchart showing a dependency hierarchy diagram.
     */
    Dependency: "dependency",

    /**
     * Mermaid JS gantt chart showing a schedule diagram.
     */
    Gantt: "gantt",
});

/**
 * Azure DevOps effort field unit of measure enumeration.
 */
const EffortUnit = Object.freeze({
    /**
     * Effort field is measured in days.
     */
    Days: 'd',

    /**
     * Effort field is measured in weeks.
     */
    Weeks: 'w',
});