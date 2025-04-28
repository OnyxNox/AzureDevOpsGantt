import { AzureDevOpsClient } from "./azure_dev_ops_client";
import { DiagramType, EffortUnit, LocalStorageKey } from "./enums";
import { IAuthenticationSettings, IContextSettings, IEnvironmentSettings, ISettings, ISubSettings, IUserInterfaceSettings } from "./interfaces";
import { MermaidJsClient } from "./mermaid_js_client";

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
        defaultEffort: 3,
        diagramType: DiagramType.Gantt,
        resourceCount: 1,
    };

    /**
     * Initialize controls using the previous session's settings from local storage.
     */
    public static async loadSettingsFromLocalStorage() {
        const localStorageSettings: ISettings =
            JSON.parse(localStorage.getItem(LocalStorageKey.Settings) ?? "{}");

        Object.assign(
            Settings,
            {
                authentication: { ...Settings.authentication, ...localStorageSettings.authentication },
                context: { ...Settings.context, ...localStorageSettings.context },
                environment: { ...Settings.environment, ...localStorageSettings.environment },
                userInterface: { ...Settings.userInterface, ...localStorageSettings.userInterface },
            });

        [
            ["userEmail", Settings.authentication.userEmail],
            ["personalAccessToken", Settings.authentication.personalAccessToken],
            ["cacheCredentials", Settings.authentication.cacheCredentials],
            ["organizationName", Settings.context.organizationName],
            ["projectName", Settings.context.projectName],
            ["featureWorkItemId", Settings.context.featureWorkItemId],
            ["dependencyRelation", Settings.environment.dependencyRelation],
            ["effortField", Settings.environment.effortField],
            [document.querySelector(`input[type="radio"][name="effortFieldUnits"]`
                + `[value=${Settings.environment.effortFieldUnits}]`), true],
            ["priorityField", Settings.environment.priorityField],
            ["tagSectionPrefix", Settings.environment.tagSectionPrefix],
            ["resourceCount", Settings.userInterface.resourceCount],
            [document.querySelector(`input[type="radio"][name="diagramType"]`
                + `[value=${Settings.userInterface.diagramType}]`), true],
        ].forEach(([inputElementId, value]) => {
            const inputElement = typeof inputElementId === "string" || inputElementId instanceof String
                ? document.getElementById(inputElementId as string)
                : inputElementId;

            if (inputElement instanceof HTMLInputElement && value) {
                if (inputElement.type === "checkbox" || inputElement.type === "radio") {
                    inputElement.checked = value as boolean;

                    const grandParentElement = inputElement.parentElement?.parentElement?.parentElement;
                    if (grandParentElement?.classList.contains("dropdown") && value) {
                        Settings.setDropdownValue(inputElement, inputElement.value);
                    }
                } else {
                    inputElement.value = value as string;
                }
            }
        });

        await MermaidJsClient.renderDiagramFromLocalStorage();

        Settings.azureDevOpsClient = new AzureDevOpsClient(
            Settings.authentication.userEmail,
            Settings.authentication.personalAccessToken,
            Settings.context.organizationName,
            Settings.context.projectName);
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

        Settings[section] ??= {} as any;
        (Settings[section] as any)[event.target.name] = value;

        await MermaidJsClient.renderDiagramFromLocalStorage();

        clearTimeout(Settings.getDebounceTimerId);

        if (await Settings.hasInvalidContext()) {
            return;
        }

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

            const ganttDiagram = mermaidJsClient.getGanttDiagram(new Date(
                featureWorkItem!.fields["Microsoft.VSTS.Scheduling.StartDate"]));

            let dependencyDiagram = mermaidJsClient.getDependencyDiagram();

            localStorage.setItem(LocalStorageKey.GanttDiagram, ganttDiagram);
            localStorage.setItem(LocalStorageKey.DependencyDiagram, dependencyDiagram);

            await MermaidJsClient.renderDiagramFromLocalStorage();
        }, 250);
    }

    private static async hasInvalidContext(): Promise<boolean> {
        if (!(await Settings.azureDevOpsClient.hasValidContext())) {
            Settings.azureDevOpsClient = new AzureDevOpsClient(
                Settings.authentication.userEmail,
                Settings.authentication.personalAccessToken,
                Settings.context.organizationName,
                Settings.context.projectName);

            if (!(await Settings.azureDevOpsClient.hasValidContext())) {
                return true;
            }
        }

        return false;
    }

    private static setDropdownValue(eventTarget: HTMLInputElement, value: string) {
        const dropdownParent = eventTarget.parentElement?.parentElement?.parentElement;
        const selected = Object.keys(EffortUnit)
            .find(unit => EffortUnit[unit as keyof typeof EffortUnit] === value);

        if (dropdownParent) {
            (dropdownParent.childNodes[1] as HTMLElement)
                .innerHTML = `<input type="checkbox" /> ${selected}`;
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