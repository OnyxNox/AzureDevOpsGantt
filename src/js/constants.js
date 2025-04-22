/**
 * Collection of constant values used throughout the application.
 */
const Constants = (function () {
    return {
        /**
         * Collection of Azure DevOps resources and field names.
         */
        azure_dev_ops: {
            /**
             * Azure DevOps Feature work item start date field name.
             */
            FEATURE_WORK_ITEM_START_DATE_FIELD: "Microsoft.VSTS.Scheduling.StartDate",

            /**
             * Azure DevOps Feature work item type.
             */
            FEATURE_WORK_ITEM_TYPE: "Feature",

            /**
             * Azure DevOps work item tag that identifies a milestone.
             */
            MILESTONE_SECTION_TAG: "Milestone",

            /**
             * Azure DevOps work item default effort, measured in days.
             */
            WORK_ITEM_DEFAULT_EFFORT: 3,

            /**
             * Azure DevOps work item tags field name.
             */
            WORK_ITEM_TAGS_FIELD: "System.Tags",

            /**
             * Azure DevOps work item title field name.
             */
            WORK_ITEM_TITLE_FIELD: "System.Title",

            /**
             * Azure DevOps work item type field name.
             */
            WORK_ITEM_TYPE_FIELD: "System.WorkItemType",
        },
        /**
         * Collection of local storage keys.
         */
        localStorage: {
            /**
             * Local storage dependency diagram key; value contains previous session's dependency
             * diagram.
             */
            DEPENDENCY_DIAGRAM_KEY: "dependencyDiagram",

            /**
             * Local storage gantt diagram key; value contains previous session's gantt diagram.
             */
            GANTT_DIAGRAM_KEY: "ganttDiagram",

            /**
             * Local storage settings key; value contains previous session's settings.
             */
            SETTINGS_KEY: "settings",
        },
        /**
         * Collection of user interface element identifiers.
         */
        userInterface: {
            /**
             * Control panel toggle checkbox HTML element identifier.
             */
            CONTROL_PANEL_TOGGLE_ELEMENT_ID: "controlPanelToggle",

            /**
             * Loading overlay HTML element identifier.
             */
            LOADING_OVERLAY_ELEMENT_ID: "loadingOverlay",

            /**
             * Mermaid diagram output HTML element identifier.
             */
            MERMAID_DIAGRAM_OUTPUT_ELEMENT_ID: "mermaidDiagramOutput",
        },
    };
})();