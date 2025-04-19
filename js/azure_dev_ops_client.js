/**
 * HTTP client used to interface with Azure DevOps APIs.
 */
class AzureDevOpsClient {
    static #DOMAIN = "https://dev.azure.com";
    static #QUERY_PARAMETERS = "api-version=7.1&$expand=relations";

    #organizationName;
    #projectName;
    #requestHeaders;

    /**
     * Initialize a new instance of the {@link AzureDevOpsClient}.
     * @param {string} userEmail Azure DevOps user email address used to authenticate requests.
     * @param {string} personalAccessToken Personal access token used to authenticate requests.
     * @param {string} organizationName Azure DevOps organization that work items are under.
     * @param {string} projectName Azure DevOps organization's project that work items are under.
     */
    constructor(userEmail, personalAccessToken, organizationName, projectName) {
        this.#requestHeaders = {
            "Accept": "application/json",
            "Authorization": `Basic ${btoa(`${userEmail}:${personalAccessToken}`)}`,
        };

        this.#organizationName = organizationName;
        this.#projectName = projectName;
    }

    /**
     * Get a work item by its identifier.
     * @param {number | string} workItemId Work item identifier.
     * @returns {Object} Azure DevOps work item.
     */
    async getWorkItem(workItemId) {
        return (await this.getWorkItems([workItemId])).value[0];
    }

    /**
     * Get a collection of work items by their identifiers.
     * @param {number[] | string[]} workItemIds Collection of work item identifiers.
     * @returns {Object[]} Azure DevOps work items.
     */
    async getWorkItems(workItemIds) {
        const workItemsUrl = `${AzureDevOpsClient.#DOMAIN}/${this.#organizationName}/`
            + `${this.#projectName}/_apis/wit/workitems?ids=${workItemIds.join(',')}`
            + `&${AzureDevOpsClient.#QUERY_PARAMETERS}`

        return await (await fetch(workItemsUrl, { headers: this.#requestHeaders })).json();
    }
}