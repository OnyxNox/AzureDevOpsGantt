use serde::Deserialize;

/// Represents a configuration file.
#[derive(Debug, Deserialize)]
pub struct Configuration {
    /// Personal access token used to authenticate requests.
    pub access_token: String,

    /// Azure DevOps organization that work items are under.
    pub organization: String,

    /// Azure DevOps user's email address used to authenticate requests.
    pub user: String,
}

/// Represents a HTTP response from Azure DevOps.
#[derive(Debug, Deserialize)]
pub struct Response {
    pub count: u32,
}
