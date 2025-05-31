import { DiagramType, EffortUnit, LocalStorageKey, Timeline } from "./enums";
import { IAuthenticationSettings, IContextSettings, IEnvironmentSettings, ISettings, ISubSettings, IUserInterfaceSettings } from "./interfaces/settings_interfaces";
import { MermaidJsService } from "./mermaid_js_service";

/**
 * Settings HTML input element event.
 */
type SettingsInputElementEvent
    = Event & { target: HTMLInputElement & { name: keyof ISubSettings } };

/**
 * Default authentication settings.
 */
const DEFAULT_AUTHENTICATION_SETTINGS: IAuthenticationSettings =
    { cacheCredentials: false, personalAccessToken: "", userEmail: "" };

/**
 * Global settings.
 */
export class Settings {
    /**
     * Debounce timer identifier used to prevent too many external requests when update setting is
     * being called rapidly.
     */
    private static updateSettingDebounceTimerId: number = 0;

    /**
     * Azure DevOps authentication settings.
     */
    public static authentication: IAuthenticationSettings = DEFAULT_AUTHENTICATION_SETTINGS;

    /**
     * Azure DevOps context settings.
     */
    public static context: IContextSettings = {
        featureWorkItemId: "",
        organizationName: "",
        projectName: "",
    };

    /**
     * Azure DevOps environment settings.
     */
    public static environment: IEnvironmentSettings = {
        dependencyRelation: "Tests",
        effortField: "Microsoft.VSTS.Scheduling.RemainingWork",
        effortFieldUnits: EffortUnit.Days,
        priorityField: "Microsoft.VSTS.Common.Priority",
        tagSectionPrefix: "Section:",
    };

    /**
     * User interface settings.
     */
    public static userInterface: IUserInterfaceSettings = {
        asOf: "",
        defaultEffort: 3,
        diagramType: DiagramType.Gantt,
        timeline: Timeline.Projected,
        resourceCount: 1,
    };

    /**
     * Initialize controls with the previous session's values.
     */
    public static async initialize() {
        const localStorageSettings: ISettings
            = JSON.parse(localStorage.getItem(LocalStorageKey.Settings) ?? "{}");

        Object.assign(
            Settings,
            {
                authentication: { ...Settings.authentication, ...localStorageSettings.authentication },
                context: { ...Settings.context, ...localStorageSettings.context },
                environment: { ...Settings.environment, ...localStorageSettings.environment },
                userInterface: { ...Settings.userInterface, ...localStorageSettings.userInterface },
            });

        Settings.loadSettingsIntoHtmlInputElements();

        if (Settings.allRequiredFieldsHaveValues()) {
            await MermaidJsService.refreshDiagram();
        }
    }

    /**
     * Update setting in-memory, write settings to local storage and refresh the diagram.
     */
    public static async updateSetting(section: keyof ISettings, event: SettingsInputElementEvent) {
        (Settings[section] as any)[event.target.name] = Settings.castSettingValue(event);

        clearTimeout(Settings.updateSettingDebounceTimerId);

        Settings.updateSettingDebounceTimerId = window.setTimeout(async () => {
            localStorage.setItem(
                LocalStorageKey.Settings,
                JSON.stringify(Settings.toJson(Settings.authentication.cacheCredentials)));

            await MermaidJsService.refreshDiagram();
        }, 250);
    }

    /**
     * Check if all required input fields have a value and expand the sections with invalid fields.
     * @returns True if all required input fields have a value, otherwise false.
     */
    private static allRequiredFieldsHaveValues(): boolean {
        let allRequiredFieldsHaveValues = true;

        document.querySelectorAll("#controlPanel input[required]").forEach(input => {
            const requiredInput = input as HTMLInputElement;

            if (requiredInput.value.trim() === "") {
                const requiredInputSection = requiredInput
                    .parentElement?.parentElement?.previousElementSibling;

                const inputSectionCheckbox = requiredInputSection
                    ?.querySelector("label>input[type='checkbox']") as HTMLInputElement;

                inputSectionCheckbox.checked = true;

                allRequiredFieldsHaveValues = false;
            }
        });

        return allRequiredFieldsHaveValues;
    }

    private static castSettingValue(event: SettingsInputElementEvent): boolean | number | string {
        let value: boolean | number | string;
        switch (event.target.type) {
            case "checkbox":
                value = event.target.checked;
                break;

            case "number":
                value = parseInt(event.target.value);
                break;

            default:
                value = event.target.value;
        }

        return value;
    }

    private static flattenObject(obj: Record<string, any>): Record<string, any> {
        let flattenedObject: Record<string, any> = {};

        Object.keys(obj).forEach(key => {
            if (obj[key] !== null && typeof obj[key] === "object") {
                Object.assign(flattenedObject, Settings.flattenObject(obj[key]));
            } else {
                flattenedObject[key] = obj[key];
            }
        });

        return flattenedObject;
    }

    private static loadSettingsIntoHtmlInputElements(): void {
        const flattenedSettings = Settings.flattenObject(Settings.toJson(true));

        for (const [key, value] of Object.entries(flattenedSettings)) {
            const inputElement = document.getElementById(key) as HTMLInputElement | null;

            if (inputElement === null) {
                document.getElementsByName(key).forEach(inputElement => {
                    const radioElement = inputElement as HTMLInputElement;

                    if (radioElement.value === value) {
                        radioElement.checked = true;
                    }
                });

                continue;
            } else if (inputElement.type === "checkbox") {
                inputElement.checked = value;
            } else {
                inputElement.value = value;
            }
        }
    }

    private static toJson(includeAuthentication: boolean = false): ISettings {
        return {
            authentication: includeAuthentication
                ? Settings.authentication
                : DEFAULT_AUTHENTICATION_SETTINGS,
            context: Settings.context,
            environment: Settings.environment,
            userInterface: Settings.userInterface,
        };
    }
}