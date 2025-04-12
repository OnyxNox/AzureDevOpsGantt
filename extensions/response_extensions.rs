use log::debug;
use reqwest::Response;
use serde::de::DeserializeOwned;

pub trait ResponseExtensions {
    async fn json<T>(self) -> reqwest::Result<T>
    where
        T: DeserializeOwned;
}

impl ResponseExtensions for Response {
    async fn json<T>(self) -> reqwest::Result<T>
    where
        T: DeserializeOwned,
    {
        let response_text = self.text().await?;

        let response = serde_json::from_str(&response_text)
            .map_err(|error| {
                debug!(
                    "Failed to deserialize work item response. Response: {}",
                    response_text
                );

                error
            })
            .expect("failed to deserialize work item response");

        Ok(response)
    }
}
