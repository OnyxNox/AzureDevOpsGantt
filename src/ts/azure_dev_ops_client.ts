import { Settings } from "./settings";

/**
 * HTTP client used to interface with Azure DevOps APIs.
 */
export class AzureDevOpsClient {
    /**
     * Azure DevOps REST API version query parameter used in all requests.
     */
    private static readonly API_VERSION: string = "api-version=7.1";

    /**
     * Azure DevOps base URL.
     */
    private static readonly ADO_BASE_URL: string = "https://dev.azure.com";

    /**
     * Visual Studio Shared Platform Services (VSSPS) base URL.
     */
    private static readonly VSSPS_BASE_URL: string = "https://app.vssps.visualstudio.com";

    /**
     * Azure DevOps REST API headers used in all requests.
     */
    private requestHeaders: Record<string, string>;

    /**
     * Initialize a new instance of the {@link AzureDevOpsClient}.
     * @param userEmail Azure DevOps user email address used to authenticate requests.
     * @param personalAccessToken Personal access token used to authenticate requests.
     */
    constructor(userEmail: string, personalAccessToken: string) {
        this.requestHeaders = {
            "Accept": "application/json",
            "Authorization": `Basic ${btoa(`${userEmail}:${personalAccessToken}`)}`,
        };
    }

    /**
     * Get work item's identifier from a direct URL to the work item.
     * @param workItemUrl Work item URL.
     * @returns Work item's identifier.
     */
    static getWorkItemIdFromUrl(workItemUrl: string): number {
        return parseInt(workItemUrl.substring(workItemUrl.lastIndexOf('/') + 1));
    }

    /**
     * Get a collection of feature work items by its identifier.
     * @param featureWorkItemId Feature work item identifier.
     * @returns Azure DevOps work items.
     */
    async getFeatureWorkItems(
        featureWorkItemId: number | string,
        asOf: Date | null = null,
    ): Promise<any[]> {
        const featureWorkItem = await this.getWorkItem(featureWorkItemId, asOf);

        const childWorkItemIds = featureWorkItem
            .relations
            .filter((workItemRelation: { attributes: { name: string }; url: string }) =>
                workItemRelation.attributes.name === "Child")
            .map((childWorkItem: { url: string }) =>
                AzureDevOpsClient.getWorkItemIdFromUrl(childWorkItem.url));

        const featureWorkItems = [featureWorkItem];
        featureWorkItems.push(...(await this.getWorkItems(childWorkItemIds, asOf)).value);

        return featureWorkItems;
    }

    /**
     * Get a collection of Azure DevOps organizations the authenticated user has access to.
     * @param memberId Azure DevOps profile identifier.
     * @returns Azure DevOps organizations.
     */
    async getOrganizations(memberId: string): Promise<any> {
        const organizationsUrl = `${AzureDevOpsClient.VSSPS_BASE_URL}/_apis/accounts`
            + `?memberId=${memberId}&${AzureDevOpsClient.API_VERSION}`;

        return await this.fetchJson(organizationsUrl);
    }

    /**
     * Get the authenticated user's Azure DevOps profile.
     * @returns Azure DevOps profile.
     */
    async getProfile(): Promise<any> {
        const profileUrl = `${AzureDevOpsClient.VSSPS_BASE_URL}/_apis/profile/profiles/me`
            + `?${AzureDevOpsClient.API_VERSION}`;

        return await this.fetchJson(profileUrl);
    }

    /**
     * Get a collection of projects under the organization.
     * @returns Azure DevOps projects.
     */
    async getProjects(): Promise<any> {
        const projectsUrl = `${AzureDevOpsClient.ADO_BASE_URL}/${Settings.context.organizationName}`
            + `/_apis/projects?${AzureDevOpsClient.API_VERSION}`;

        return await this.fetchJson(projectsUrl);
    }

    /**
     * Get a work item by its identifier.
     * @param workItemId Work item identifier.
     * @returns Azure DevOps work item.
     */
    async getWorkItem(workItemId: number | string, asOf: Date | null = null): Promise<any> {
        return (await this.getWorkItems([workItemId], asOf)).value[0];
    }

    /**
     * Get a collection of work items by their identifiers.
     * @param workItemIds Collection of work item identifiers.
     * @returns Azure DevOps work items.
     */
    async getWorkItems(workItemIds: (number | string)[], asOf: Date | null = null): Promise<any> {
        const asOfQueryParam = asOf == null ? "" : `&asOf=${asOf.toISOString()}`;

        const workItemsUrl = AzureDevOpsClient.ADO_BASE_URL
            + `/${AzureDevOpsClient.getWorkItemsUrl()}/workitems?ids=${workItemIds.join(',')}`
            + `${asOfQueryParam}&$expand=relations&${AzureDevOpsClient.API_VERSION}`;

        const workItems = await this.fetchJson(workItemsUrl);

        return workItems;
    }

    /**
     * Get a collection of all work item types.
     * @returns Azure DevOps work item types.
     */
    async getWorkItemTypes(): Promise<any> {
        const workItemTypesUrl = AzureDevOpsClient.ADO_BASE_URL
            + `/${AzureDevOpsClient.getWorkItemsUrl()}/workitemtypes`
            + `?${AzureDevOpsClient.API_VERSION}`;

        return await this.fetchJson(workItemTypesUrl);
    }

    /**
     * Get a collection of all work item type states.
     * @param workItemType Work item type.
     * @returns Azure DevOps work item type states.
     */
    async getWorkItemTypeStates(workItemType: string) {
        const workItemTypesUrl = AzureDevOpsClient.ADO_BASE_URL
            + `/${AzureDevOpsClient.getWorkItemsUrl()}/workitemtypes/${workItemType}/states`
            + `?${AzureDevOpsClient.API_VERSION}`;

        return await this.fetchJson(workItemTypesUrl);
    }

    async getWorkItemUpdates(workItemId: number | string): Promise<any> {
        const workItemUpdatesUrl = AzureDevOpsClient.ADO_BASE_URL
            + `/${AzureDevOpsClient.getWorkItemsUrl()}/workItems/${workItemId}/updates`
            + `?${AzureDevOpsClient.API_VERSION}`;

        return await this.fetchJson(workItemUpdatesUrl);
    }

    /**
     * Check if credentials has access to the organization's project's work items.
     * @returns True if credentials has access to the organization's project's work items, otherwise
     * false.
     */
    async hasValidContext(): Promise<boolean> {
        try {
            await this.getWorkItemTypes();
        } catch (error) {
            return false;
        }

        return true;
    }

    private static getWorkItemsUrl(): string {
        return `${Settings.context.organizationName}/${Settings.context.projectName}/_apis/wit`;
    }

    /**
     * Run fetch request and parse response payload as JSON.
     * @param requestUrl Request URL.
     * @returns Response payload as JSON.
     */
    private async fetchJson(requestUrl: string) {
        return await (await fetch(requestUrl, { headers: this.requestHeaders })).json();
    }
}
