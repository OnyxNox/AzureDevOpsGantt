import { AzureDevOpsClient } from "./azure_dev_ops_client";
import { DiagramType, EffortUnit, LocalStorageKey } from "./enums";
import { IAuthenticationSettings, IContextSettings, IEnvironmentSettings, ISettings, ISubSettings, IUserInterfaceSettings } from "./interfaces/settings_interfaces";
import { MermaidJsClient } from "./mermaid_js_client";
import { flattenObject } from "./utility";

/**
 * Default authentication settings.
 */
const DEFAULT_AUTHENTICATION_SETTINGS: IAuthenticationSettings =
    { cacheCredentials: false, personalAccessToken: "", userEmail: "" };

/**
 * Global settings used throughout the application.
 */
export class Settings {
    /**
     * HTTP client used to interface with Azure DevOps APIs.
     */
    private static azureDevOpsClient: AzureDevOpsClient;

    /**
     * Debounce timer identifier for a timer used to prevent too many external requests when
     * updating settings.
     */
    private static getDebounceTimerId: number = 0;

    static authentication: IAuthenticationSettings = DEFAULT_AUTHENTICATION_SETTINGS;

    static context: IContextSettings = {
        featureWorkItemId: "",
        organizationName: "",
        projectName: "",
    };

    static environment: IEnvironmentSettings = {
        dependencyRelation: "Tests",
        effortField: "Microsoft.VSTS.Scheduling.RemainingWork",
        effortFieldUnits: EffortUnit.Days,
        priorityField: "Microsoft.VSTS.Common.Priority",
        tagSectionPrefix: "Section:",
    };

    static userInterface: IUserInterfaceSettings = {
        asOf: "Now",
        defaultEffort: 3,
        diagramType: DiagramType.Gantt,
        resourceCount: 1,
    };

    /**
     * Initialize controls using the previous session's settings from local storage.
     */
    public static async loadSettingsFromLocalStorage() {
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

        Settings.azureDevOpsClient = new AzureDevOpsClient(
            Settings.authentication.userEmail,
            Settings.authentication.personalAccessToken);

        if (!Settings.allRequiredFieldsHaveValues()) {
            return;
        }
    }

    /**
     * Update setting in-memory, write settings to local storage and refresh the diagram.
     */
    public static async updateSetting(
        section: keyof ISettings,
        event: Event & { target: HTMLInputElement & { name: keyof ISubSettings } },
    ) {
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

        (Settings[section] as any)[event.target.name] = value;

        clearTimeout(Settings.getDebounceTimerId);

        // if (await Settings.hasInvalidContext()) {
        //     return;
        // }

        Settings.getDebounceTimerId = window.setTimeout(async () => {
            localStorage.setItem(
                LocalStorageKey.Settings,
                JSON.stringify(Settings.toJson(Settings.authentication.cacheCredentials)));

            const featureWorkItems = await Settings.azureDevOpsClient
                .getFeatureWorkItems(Settings.context.featureWorkItemId);
            const featureWorkItem = featureWorkItems
                .find(workItem => workItem.fields["System.WorkItemType"] === "Feature");
            const childWorkItems = featureWorkItems
                .filter(workItem => workItem.fields["System.WorkItemType"] !== "Feature");

            const mermaidJsClient = new MermaidJsClient(childWorkItems);

            let dependencyDiagram = mermaidJsClient.getDependencyDiagram();

            localStorage.setItem(LocalStorageKey.DependencyDiagram, dependencyDiagram);

            const workItemStates = (await Settings.azureDevOpsClient
                .getWorkItemTypeStates(childWorkItems[0].fields["System.WorkItemType"]))
                .value;

            const ganttDiagram = await mermaidJsClient.getGanttDiagram(
                new Date(featureWorkItem!.fields["Microsoft.VSTS.Scheduling.StartDate"]),
                workItemStates);

            localStorage.setItem(LocalStorageKey.GanttDiagram, ganttDiagram.raw);

            document.getElementById("mermaidJsDiagramOutput")!.replaceChildren(ganttDiagram.svg);
        }, 250);
    }

    private static allRequiredFieldsHaveValues(): boolean {
        let allRequiredFieldsHaveValues = true;

        document.querySelectorAll("#controlPanel input[required]").forEach(input => {
            const requiredInput = input as HTMLInputElement;

            if (requiredInput.value.trim() === "") {
                const requiredInputSection = requiredInput.parentElement?.parentElement?.previousElementSibling;

                const inputSectionCheckbox = requiredInputSection?.querySelector("label>input[type='checkbox']") as HTMLInputElement;

                inputSectionCheckbox.checked = true;

                allRequiredFieldsHaveValues = false;
            }
        });

        return allRequiredFieldsHaveValues;
    }

    private static loadSettingsIntoHtmlInputElements(): void {
        const flattenedSettings = flattenObject(Settings.toJson(true));

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
            }

            if (inputElement.type === "checkbox") {
                inputElement.checked = value;
            } else {
                inputElement.value = value;
            }
        }
    }

    private static async hasInvalidContext(): Promise<boolean> {
        if (!(await Settings.azureDevOpsClient.hasValidContext())) {
            Settings.azureDevOpsClient = new AzureDevOpsClient(
                Settings.authentication.userEmail,
                Settings.authentication.personalAccessToken);

            if (!(await Settings.azureDevOpsClient.hasValidContext())) {
                return true;
            }
        }

        return false;
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