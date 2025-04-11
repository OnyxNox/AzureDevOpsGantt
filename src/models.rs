use serde::Deserialize;

/// Represents a configuration file.
#[derive(Debug, Deserialize)]
pub struct Configuration {
    /// Personal access token used to authenticate requests.
    pub access_token: String,

    /// Azure DevOps organization that work items are under.
    pub organization: String,
}
