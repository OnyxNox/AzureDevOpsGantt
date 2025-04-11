use base64::Engine;
use log::{debug, trace};
use reqwest::{
    Client,
    header::{ACCEPT, AUTHORIZATION, HeaderMap, HeaderValue},
};

use crate::models::{Context, WorkItem};

const AZURE_DEV_OPS_API_VERSION: &str = "api-version=7.1";
const AZURE_DEV_OPS_DOMAIN: &str = "https://dev.azure.com";

/// HTTP client used to interface with Azure DevOps APIs.
pub struct AzureDevOpsClient {
    /// Context.
    context: Context,

    /// Underlying reqwest HTTP client.
    http_client: Client,
}

impl AzureDevOpsClient {
    /// Initialize a new AzureDevOpsClient instance.
    pub fn new(context: Context) -> Self {
        trace!("Initializing Azure DevOps client.");

        let azure_dev_ops_client = Self {
            context,
            http_client: Client::new(),
        };

        debug!("Azure DevOps client initialized successfully!");

        azure_dev_ops_client
    }

    /// Get work item by identifier.
    pub async fn work_item(&self, work_item_id: u32) -> Result<WorkItem, reqwest::Error> {
        self.get(&format!(
            "{}/{}/{}/_apis/wit/workitems/{}?{}",
            AZURE_DEV_OPS_DOMAIN,
            self.context.organization_name,
            self.context.project_name,
            work_item_id,
            AZURE_DEV_OPS_API_VERSION
        ))
        .await?
        .json::<WorkItem>()
        .await
    }

    /// Send HTTP GET request to the given request URL.
    async fn get(&self, request_url: &String) -> Result<reqwest::Response, reqwest::Error> {
        trace!("Sending GET {}", request_url);

        let response = self
            .http_client
            .get(request_url)
            .headers(self.headers())
            .send()
            .await?;

        debug!("GET {} - {}", request_url, response.status());

        Ok(response)
    }

    /// Build headers used across requests.
    fn headers(&self) -> HeaderMap {
        trace!("Building header map common across requests.");

        let mut headers = HeaderMap::new();
        headers.insert(ACCEPT, HeaderValue::from_static("application/json"));
        headers.insert(
            AUTHORIZATION,
            HeaderValue::from_str(&format!(
                "Basic {}",
                base64::engine::general_purpose::STANDARD.encode(format!(
                    "{}:{}",
                    self.context.user_email, self.context.personal_access_token
                ))
            ))
            .expect("failed to parse authorization header"),
        );

        trace!("Header map built successfully!");

        headers
    }
}
