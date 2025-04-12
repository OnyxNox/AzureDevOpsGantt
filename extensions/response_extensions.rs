use log::debug;
use reqwest::Response;
use serde::de::DeserializeOwned;

/// Collection of reqwest response helper extension methods.
pub trait ResponseExtensions {
    /// Deserialize the response from JSON.
    async fn json<T>(self) -> reqwest::Result<T>
    where
        T: DeserializeOwned;
}

impl ResponseExtensions for Response {
    async fn json<T>(self) -> reqwest::Result<T>
    where
        T: DeserializeOwned,
    {
        let response = self.text().await?;
        let response = serde_json::from_str(&response)
            .inspect_err(|_error| {
                debug!("Failed to deserialize response. Response: {}", response);
            })
            .expect("failed to deserialize response");

        Ok(response)
    }
}
