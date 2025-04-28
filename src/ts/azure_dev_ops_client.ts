/**
 * HTTP client used to interface with Azure DevOps APIs.
 */
export class AzureDevOpsClient {
    /**
     * Azure DevOps REST API version query parameter used in all requests.
     */
    private static readonly API_VERSION: string = "api-version=7.1";

    /**
     * Azure DevOps REST API base URL used in all requests.
     */
    private baseUrl: string;

    /**
     * Azure DevOps REST API authorization headers used in all requests.
     */
    private requestHeaders: Record<string, string>;

    /**
     * Initialize a new instance of the {@link AzureDevOpsClient}.
     * @param userEmail Azure DevOps user email address used to authenticate requests.
     * @param personalAccessToken Personal access token used to authenticate requests.
     * @param organizationName Azure DevOps organization that work items are under.
     * @param projectName Azure DevOps organization's project that work items are under.
     */
    constructor(
        userEmail: string,
        personalAccessToken: string,
        organizationName: string,
        projectName: string,
    ) {
        this.baseUrl = `https://dev.azure.com/${organizationName}/${projectName}`;

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
     * @param includeFeatureWorkItem Include the feature work item in the returned collection?
     * @returns Azure DevOps work items.
     */
    async getFeatureWorkItems(
        featureWorkItemId: number | string, includeFeatureWorkItem: boolean = true
    ): Promise<any[]> {
        const featureWorkItem = await this.getWorkItem(featureWorkItemId);

        const childWorkItemIds = featureWorkItem
            .relations
            .filter((workItemRelation: { attributes: { name: string }; url: string }) =>
                workItemRelation.attributes.name === "Child")
            .map((childWorkItem: { url: string }) =>
                AzureDevOpsClient.getWorkItemIdFromUrl(childWorkItem.url));

        const featureWorkItems = includeFeatureWorkItem ? [featureWorkItem] : [];
        featureWorkItems.push(...(await this.getWorkItems(childWorkItemIds)).value);

        return featureWorkItems;
    }

    /**
     * Get a work item by its identifier.
     * @param workItemId Work item identifier.
     * @returns Azure DevOps work item.
     */
    async getWorkItem(workItemId: number | string): Promise<any> {
        return (await this.getWorkItems([workItemId])).value[0];
    }

    /**
     * Get a collection of work items by their identifiers.
     * @param workItemIds Collection of work item identifiers.
     * @returns Azure DevOps work items.
     */
    async getWorkItems(workItemIds: (number | string)[]): Promise<any> {
        const workItemsUrl: string = `${this.baseUrl}/_apis/wit/workitems`
            + `?ids=${workItemIds.join(',')}&$expand=relations&${AzureDevOpsClient.API_VERSION}`;

        return await this.fetchJson(workItemsUrl);
    }

    /**
     * Get a collection of all work item types.
     * @returns Azure DevOps work item types.
     */
    async getWorkItemTypes(): Promise<any> {
        const workItemTypesUrl: string = `${this.baseUrl}/_apis/wit/workitemtypes`
            + `?${AzureDevOpsClient.API_VERSION}`;

        return await this.fetchJson(workItemTypesUrl);
    }

    /**
     * Get a collection of all work item type states.
     * @param workItemType Work item type.
     * @returns Azure DevOps work item type states.
     */
    async getWorkItemTypeStates(workItemType: string) {
        const workItemTypesUrl: string = `${this.baseUrl}/_apis/wit/workitemtypes/${workItemType}`
            + `/states?${AzureDevOpsClient.API_VERSION}`;

        return await this.fetchJson(workItemTypesUrl);
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

    /**
     * Run fetch request and parse response payload as JSON.
     * @param requestUrl Request URL.
     * @returns Response payload as JSON.
     */
    private async fetchJson(requestUrl: string) {
        return await (await fetch(requestUrl, { headers: this.requestHeaders })).json();
    }
}
