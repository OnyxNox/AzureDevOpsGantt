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

/**
 * Global settings used across the application.
 */
const Settings = (function () {
    const previousSettings =
        JSON.parse(localStorage.getItem(Constants.localStorage.SETTINGS_KEY) ?? "{}");

    const defaultSettings = {
        cacheCredentials: false,
        dependencyRelation: "Tests",
        effortField: "Microsoft.VSTS.Scheduling.RemainingWork",
        effortFieldUnits: EffortUnit.Days,
        priorityField: "Microsoft.VSTS.Common.Priority",
        resourceCount: 1,
        sectionTagPrefix: "Section:",
        selectedDiagramType: DiagramType.Gantt,
    };

    return { ...defaultSettings, ...previousSettings };
})();

window.onload = handleWindowOnLoad;

/**
 * Write setting to local storage and refresh diagram from local storage.
 * @param {Object} event Form control change event.
 * @param {any} value Settings field value.
 * @param {boolean} isDropdown Is a dropdown field?
 */
async function cacheSetting(event, value, isDropdown = false) {
    const key = event.target.name;

    if (isDropdown) {
        setDropdownValue(event.target, value);
    }

    Settings[key] = value;

    localStorage.setItem(Constants.localStorage.SETTINGS_KEY, JSON.stringify(Settings));

    const selectedDiagram = Settings.selectedDiagramType === DiagramType.Gantt
        ? localStorage.getItem(Constants.localStorage.GANTT_DIAGRAM_KEY)
        : localStorage.getItem(Constants.localStorage.DEPENDENCY_DIAGRAM_KEY);

    if (selectedDiagram) {
        document.getElementById(Constants.userInterface.MERMAID_DIAGRAM_OUTPUT_ELEMENT_ID)
            .innerHTML = (await mermaid.render("updatedGraph", selectedDiagram)).svg;
    }
}

/**
 * Handle the windows's onLoad event; used to initialize controls and seed inputs from the previous
 * session.
 */
async function handleWindowOnLoad() {
    const previousContext = localStorage.getItem(Constants.localStorage.CONTEXT_KEY);

    if (previousContext) {
        const context = JSON.parse(previousContext);

        document.getElementById(Constants.userInterface.FEATURE_WORK_ITEM_ID_ELEMENT_ID)
            .value = context.featureWorkItemId ?? "";
        document.getElementById(Constants.userInterface.ORGANIZATION_NAME_ELEMENT_ID)
            .value = context.organizationName ?? "";
        document.getElementById(Constants.userInterface.PERSONAL_ACCESS_TOKEN_ELEMENT_ID)
            .value = context.personalAccessToken ?? "";
        document.getElementById(Constants.userInterface.PROJECT_NAME_ELEMENT_ID)
            .value = context.projectName ?? "";
        document.getElementById(Constants.userInterface.USER_EMAIL_ELEMENT_ID)
            .value = context.userEmail ?? "";
    } else {
        document.getElementById(Constants.userInterface.CONTROL_PANEL_TOGGLE_ELEMENT_ID)
            .checked = true;
    }

    [
        ["cacheCredentials", Settings.cacheCredentials],
        [Constants.userInterface.DEPENDENCY_RELATION_ELEMENT_ID, Settings.dependencyRelation],
        [Constants.userInterface.EFFORT_FIELD_ELEMENT_ID, Settings.effortField],
        [Constants.userInterface.PRIORITY_FIELD_ELEMENT_ID, Settings.priorityField],
        [Constants.userInterface.RESOURCE_COUNT_ELEMENT_ID, Settings.resourceCount],
        [Constants.userInterface.SECTION_TAG_PREFIX_ELEMENT_ID, Settings.sectionTagPrefix],
        [document.querySelector(`input[type="radio"][name="effortFieldUnits"]`
            + `[value=${Settings.effortFieldUnits}]`), true],
        [document.querySelector(`input[type="radio"][name="selectedDiagramType"]`
            + `[value=${Settings.selectedDiagramType}]`), true]
    ].forEach(([inputElementId, value]) => {
        const inputElement = typeof inputElementId === "string" || inputElementId instanceof String
            ? document.getElementById(inputElementId)
            : inputElementId;

        if (inputElement.type === "checkbox" || inputElement.type === "radio") {
            inputElement.checked = value;
        } else {
            inputElement.value = value;
        }
    });

    setDropdownValue(document.querySelector(`input[type="radio"][name="effortFieldUnits"]`
        + `[value=${Settings.effortFieldUnits}]`), Settings.effortFieldUnits);

    const previousSelectedDiagram = Settings.selectedDiagramType == DiagramType.Gantt
        ? localStorage.getItem(Constants.localStorage.GANTT_DIAGRAM_KEY)
        : localStorage.getItem(Constants.localStorage.DEPENDENCY_DIAGRAM_KEY);

    if (previousSelectedDiagram) {
        document.getElementById(Constants.userInterface.MERMAID_DIAGRAM_OUTPUT_ELEMENT_ID)
            .innerHTML = (await mermaid.render("updatedGraph", previousSelectedDiagram)).svg;
    }
}

function setDropdownValue(eventTarget, value) {
    const dropdownParent = eventTarget.parentElement?.parentElement?.parentElement;
    const selected = Object.keys(EffortUnit).find(unit => EffortUnit[unit] === value);

    dropdownParent.childNodes[1].innerHTML = `<input type="checkbox" /> ${selected}`;
}