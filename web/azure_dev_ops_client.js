/**
 * HTTP client used to interface with Azure DevOps APIs.
 * @param {string} userEmail Azure DevOps user's email address used to authenticate requests.
 * @param {string} personalAccessToken Personal access token used to authenticate requests.
 * @param {string} organizationName Azure DevOps organization that work items are under.
 * @param {string} projectName Azure DevOps organization's project that work items are under.
 */
function AzureDevOpsClient(userEmail, personalAccessToken, organizationName, projectName) {
    const AZURE_DEV_OPS_DOMAIN = "https://dev.azure.com";
    const QUERY_PARAMETERS = "api-version=7.1&$expand=relations";
    const REQUEST_HEADERS = {
        "Accept": "application/json",
        "Authorization": `Basic ${btoa(`${userEmail}:${personalAccessToken}`)}`,
    };

    /**
     * Get work item by its identifier.
     * @param {number | string} workItemId Work item identifier.
     */
    this.getWorkItem = async (workItemId) => (await this.getWorkItems([workItemId])).value[0];

    /**
     * Get work items by their identifiers.
     * @param {number[] | string[]} workItemIds Collection of work item identifiers.
     */
    this.getWorkItems = async function (workItemIds) {
        const workItemsUrl = `${AZURE_DEV_OPS_DOMAIN}/${organizationName}/${projectName}/_apis/wit`
            + `/workitems?ids=${workItemIds.join(',')}&${QUERY_PARAMETERS}`;

        return await (await fetch(workItemsUrl, { headers: REQUEST_HEADERS })).json();
    }
}