/**
 * Collection of constant values used throughout the application.
 */
const Constants = (function () {
    return {
        /**
         * Collection of local storage keys.
         */
        localStorage: {
            /**
             * Local storage context key; value contains previous session's context.
             */
            CONTEXT_KEY: "context",

            /**
             * Local storage dependency diagram key; value contains previous session's dependency
             * diagram.
             */
            DEPENDENCY_DIAGRAM_KEY: "dependencyDiagram",

            /**
             * Local storage gantt diagram key; value contains previous session's gantt diagram.
             */
            GANTT_DIAGRAM_KEY: "ganttDiagram",
        },
        /**
         * Collection of user interface element identifiers.
         */
        userInterface: {
            /**
             * Context toggle checkbox HTML element identifier.
             */
            CONTEXT_TOGGLE_ELEMENT_ID: "contextToggle",

            /**
             * Dependency relation input HTML element identifier.
             */
            DEPENDENCY_RELATION_ELEMENT_ID: "dependencyRelation",

            /**
             * Feature work item identifier input HTML element identifier.
             */
            FEATURE_WORK_ITEM_ID_ELEMENT_ID: "featureWorkItemId",

            /**
             * Mermaid diagram output HTML element identifier.
             */
            MERMAID_DIAGRAM_OUTPUT_ELEMENT_ID: "mermaidDiagramOutput",

            /**
             * Organization name input HTML element identifier.
             */
            ORGANIZATION_NAME_ELEMENT_ID: "organizationName",

            /**
             * Project name input HTML element identifier.
             */
            PROJECT_NAME_ELEMENT_ID: "projectName",

            /**
             * User email input HTML element identifier.
             */
            USER_EMAIL_ELEMENT_ID: "userEmail",
        },
    };
})();