import { AzureDevOpsClient } from "./azure_dev_ops_client";
import { DiagramType, EffortUnit, LocalStorageKey } from "./enums";
import { IWorkItemTypeState } from "./interfaces";
import { IAuthenticationSettings, IContextSettings, IEnvironmentSettings, ISettings, ISubSettings, IUserInterfaceSettings } from "./interfaces/settings_interfaces";
import { MermaidJsClient } from "./mermaid_js_client";
import { flattenObject } from "./utility";

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
     * HTTP client used to interface with Azure DevOps APIs.
     */
    private static azureDevOpsClient: AzureDevOpsClient;

    /**
     * Debounce timer identifier used to prevent too many external requests when update setting is
     * being called rapidly.
     */
    private static updateSettingDebounceTimerId: number = 0;

    /**
     * Azure DevOps authentication settings.
     */
    static authentication: IAuthenticationSettings = DEFAULT_AUTHENTICATION_SETTINGS;

    /**
     * Azure DevOps context settings.
     */
    static context: IContextSettings = {
        featureWorkItemId: "",
        organizationName: "",
        projectName: "",
    };

    /**
     * Azure DevOps environment settings.
     */
    static environment: IEnvironmentSettings = {
        dependencyRelation: "Tests",
        effortField: "Microsoft.VSTS.Scheduling.RemainingWork",
        effortFieldUnits: EffortUnit.Days,
        priorityField: "Microsoft.VSTS.Common.Priority",
        tagSectionPrefix: "Section:",
    };

    /**
     * User interface settings.
     */
    static userInterface: IUserInterfaceSettings = {
        asOf: "Now",
        defaultEffort: 3,
        diagramType: DiagramType.Gantt,
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

        Settings.azureDevOpsClient = new AzureDevOpsClient(
            Settings.authentication.userEmail,
            Settings.authentication.personalAccessToken);

        Settings.loadSettingsIntoHtmlInputElements();

        if (Settings.allRequiredFieldsHaveValues()) {
            await Settings.updateDiagram();
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

            await Settings.updateDiagram();
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
            } else if (inputElement.type === "checkbox") {
                inputElement.checked = value;
            } else {
                inputElement.value = value;
            }
        }
    }

    private static async isAuthenticated(): Promise<boolean> {
        if (!(await Settings.azureDevOpsClient.hasValidContext())) {
            Settings.azureDevOpsClient = new AzureDevOpsClient(
                Settings.authentication.userEmail,
                Settings.authentication.personalAccessToken);

            return await Settings.azureDevOpsClient.hasValidContext();
        }

        return true;
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

    private static async updateDiagram() {
        if (!(await Settings.isAuthenticated())) {
            return;
        }

        const featureWorkItems = await Settings.azureDevOpsClient
            .getFeatureWorkItems(Settings.context.featureWorkItemId);
        const featureWorkItem = featureWorkItems
            .find(workItem => workItem.fields["System.WorkItemType"] === "Feature");
        const childWorkItems = featureWorkItems
            .filter(workItem => workItem.fields["System.WorkItemType"] !== "Feature");

        const workItemTypeStatePromises = childWorkItems.reduce((promises, childWorkItem) => {
            const workItemType = childWorkItem.fields["System.WorkItemType"];

            if (!(workItemType in promises)) {
                promises[workItemType] = Settings.azureDevOpsClient
                    .getWorkItemTypeStates(workItemType);
            }

            return promises;
        }, {});

        const workItemTypeStateMap: Record<string, IWorkItemTypeState> = Object.fromEntries(
            await Promise.all(Object.entries(workItemTypeStatePromises).map(async ([workItemType, promise]) => {
                const response = await promise as any;

                return [workItemType, response.value];
            }))
        );

        const mermaidJsClient = new MermaidJsClient(childWorkItems, workItemTypeStateMap);

        const workItemStates = (await Settings.azureDevOpsClient
            .getWorkItemTypeStates(childWorkItems[0].fields["System.WorkItemType"]))
            .value;

        const diagramSvg = Settings.userInterface.diagramType === DiagramType.Gantt
            ? await mermaidJsClient.getGanttDiagram(
                new Date(featureWorkItem!.fields["Microsoft.VSTS.Scheduling.StartDate"]),
                workItemStates)
            : await mermaidJsClient.getDependencyDiagram();

        document.getElementById("mermaidJsDiagramOutput")?.replaceChildren(diagramSvg);
    }
}