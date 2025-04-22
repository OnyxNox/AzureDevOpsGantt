/**
 * Global settings used across the application.
 */
const Settings = (function () {
    const previousSettings =
        JSON.parse(localStorage.getItem(Constants.localStorage.SETTINGS_KEY) ?? "{}");

    const defaultSettings = {
        actionBar: {
            diagramType: DiagramType.Gantt,
        },
        authentication: {
            cacheCredentials: false,
            personalAccessToken: "",
            userEmail: "",
        },
        configuration: {
            resourceCount: 1,
        },
        context: {
            featureWorkItemId: "",
            organizationName: "",
            projectName: "",
        },
        environment: {
            dependencyRelation: "Tests",
            effortField: "Microsoft.VSTS.Scheduling.RemainingWork",
            effortFieldUnits: EffortUnit.Days,
            priorityField: "Microsoft.VSTS.Common.Priority",
            tagSectionPrefix: "Section:",
        }
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
async function cacheSetting(section, event, value, isDropdown = false) {
    Settings[section] ??= {};
    Settings[section][event.target.name] = value;

    localStorage.setItem(Constants.localStorage.SETTINGS_KEY, JSON.stringify(Settings));

    if (isDropdown) {
        setDropdownValue(event.target, value);
    }

    const selectedDiagram = Settings.actionBar.diagramType === DiagramType.Gantt
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
    [
        ["userEmail", Settings.authentication.userEmail],
        ["personalAccessToken", Settings.authentication.personalAccessToken],
        ["cacheCredentials", Settings.authentication.cacheCredentials],
        ["organizationName", Settings.context.organizationName],
        ["projectName", Settings.context.projectName],
        ["featureWorkItemId", Settings.context.featureWorkItemId],
        ["resourceCount", Settings.configuration.resourceCount],
        ["dependencyRelation", Settings.environment.dependencyRelation],
        ["effortField", Settings.environment.effortField],
        [document.querySelector(`input[type="radio"][name="effortFieldUnits"]`
            + `[value=${Settings.environment.effortFieldUnits}]`), true],
        ["priorityField", Settings.environment.priorityField],
        ["tagSectionPrefix", Settings.environment.tagSectionPrefix],
        [document.querySelector(`input[type="radio"][name="diagramType"]`
            + `[value=${Settings.actionBar.diagramType}]`), true]
    ].forEach(([inputElementId, value]) => {
        const inputElement = typeof inputElementId === "string" || inputElementId instanceof String
            ? document.getElementById(inputElementId)
            : inputElementId;

        if (inputElement.type === "checkbox" || inputElement.type === "radio") {
            inputElement.checked = value;

            const grandParentElement = inputElement.parentElement?.parentElement?.parentElement;
            if (grandParentElement?.classList.contains("dropdown") && value) {
                setDropdownValue(inputElement, inputElement.value);
            }
        } else {
            inputElement.value = value;
        }
    });

    const previousSelectedDiagram = Settings.actionBar.diagramType == DiagramType.Gantt
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