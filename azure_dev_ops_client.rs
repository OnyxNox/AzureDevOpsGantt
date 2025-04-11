use base64::Engine;
use log::{debug, trace};
use reqwest::{
    Client,
    header::{ACCEPT, AUTHORIZATION, HeaderMap, HeaderValue},
};

use crate::models::{Configuration, Response};

const AZURE_DEV_OPS_DOMAIN: &str = "https://dev.azure.com";

/// HTTP client used to interface with Azure DevOps APIs.
pub struct AzureDevOpsClient {
    /// Configuration context.
    configuration: Configuration,

    http_client: Client,
}

impl AzureDevOpsClient {
    /// Initialize a new AzureDevOpsClient instance.
    pub fn new(configuration: Configuration) -> Self {
        trace!("Initializing Azure DevOps client.");

        let azure_dev_ops_client = Self {
            configuration,
            http_client: Client::new(),
        };

        debug!("Azure DevOps client initialized successfully!");

        azure_dev_ops_client
    }

    /// Get all projects under the organization.
    pub async fn projects(&self) -> Result<Response, reqwest::Error> {
        self.get(&format!(
            "{}/{}/_apis/projects?api-version=1.0",
            AZURE_DEV_OPS_DOMAIN, self.configuration.organization
        ))
        .await?
        .json::<Response>()
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
                    self.configuration.user, self.configuration.access_token
                ))
            ))
            .expect("failed to parse authorization header"),
        );

        trace!("Header map built successfully!");

        headers
    }
}
