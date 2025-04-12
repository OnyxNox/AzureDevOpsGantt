use base64::Engine;
use log::{debug, trace};
use reqwest::{
    Client,
    header::{ACCEPT, AUTHORIZATION, HeaderMap, HeaderValue},
};

use crate::{
    extensions::ResponseExtensions,
    models::{BulkResponse, Context, WorkItem},
};

const AZURE_DEV_OPS_API_VERSION: &str = "api-version=7.1";
const AZURE_DEV_OPS_DOMAIN: &str = "https://dev.azure.com";

/// HTTP client used to interface with Azure DevOps APIs.
pub struct AzureDevOpsClient {
    /// Azure DevOps context.
    context: Context,

    /// Request headers.
    headers: HeaderMap,

    /// Underlying reqwest HTTP client.
    http_client: Client,

    /// Logs all raw responses as traces if `true`; otherwise, only error responses are logged as
    /// errors.
    log_responses: bool,
}

impl AzureDevOpsClient {
    /// Initialize a new AzureDevOpsClient instance.
    pub fn new(context: Context, log_responses: bool) -> Self {
        trace!("Initializing Azure DevOps client.");

        let mut headers = HeaderMap::new();
        headers.insert(ACCEPT, HeaderValue::from_static("application/json"));
        headers.insert(
            AUTHORIZATION,
            HeaderValue::from_str(&format!(
                "Basic {}",
                base64::engine::general_purpose::STANDARD.encode(format!(
                    "{}:{}",
                    context.user_email, context.personal_access_token
                ))
            ))
            .expect("failed to parse authorization header"),
        );

        let azure_dev_ops_client = Self {
            context,
            headers,
            http_client: Client::new(),
            log_responses,
        };

        debug!("Azure DevOps client initialized successfully!");

        azure_dev_ops_client
    }

    /// Send HTTP GET request to the given request URL.
    pub async fn get(&self, request_url: &String) -> reqwest::Result<reqwest::Response> {
        trace!("Sending GET {}", request_url);

        let response = self
            .http_client
            .get(request_url)
            .headers(self.headers.clone())
            .send()
            .await?;

        debug!("GET {} - {}", request_url, response.status());

        response.error_for_status()
    }

    /// Get work item by its identifier.
    pub async fn work_item(&self, work_item_id: u32) -> reqwest::Result<WorkItem> {
        let work_item = self
            .work_items(vec![work_item_id])
            .await?
            .value
            .into_iter()
            .next()
            .expect("failed to get first work item from bulk response");

        Ok(work_item)
    }

    /// Get work items by their identifiers.
    pub async fn work_items(
        &self,
        work_item_ids: Vec<u32>,
    ) -> reqwest::Result<BulkResponse<WorkItem>> {
        let work_item_ids = work_item_ids
            .iter()
            .map(|number| number.to_string())
            .collect::<Vec<_>>()
            .join(",");

        self.get(&format!(
            "{}/{}/{}/_apis/wit/workitems?{}&ids={}&$expand=relations",
            AZURE_DEV_OPS_DOMAIN,
            self.context.organization_name,
            self.context.project_name,
            AZURE_DEV_OPS_API_VERSION,
            work_item_ids,
        ))
        .await?
        .json(self.log_responses)
        .await
    }
}
