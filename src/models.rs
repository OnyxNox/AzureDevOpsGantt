use clap::Parser;
use log::LevelFilter;
use serde::Deserialize;

/// Welcome to Azure DevOps Gantt tool!
#[derive(Debug, Parser)]
#[command(version, about, long_about = None)]
pub struct CliArguments {
    /// Set the level of logging; sometimes referred to as "verbosity." Valid Values: off, error,
    /// warn, info, debug, trace
    #[arg(short, long, global = true, default_value_t = LevelFilter::Info)]
    pub log_level: LevelFilter,
}

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
    /// Number of records in the response's value payload.
    pub count: u32,
}
