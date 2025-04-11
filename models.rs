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

    /// Azure DevOps root work item identifier.
    pub root_work_item_id: u32,
}

/// Represents a configuration file.
#[derive(Debug, Deserialize)]
pub struct Configuration {
    /// Personal access token used to authenticate requests.
    pub access_token: String,

    /// Azure DevOps organization that work items are under.
    pub organization: String,

    /// Azure DevOps organization's project that work items are under.
    pub project: String,

    /// Azure DevOps user's email address used to authenticate requests.
    pub user: String,
}

/// Represents a work item in Azure DevOps.
#[derive(Debug, Deserialize)]
pub struct WorkItem {
    /// Azure DevOps work item identifier.
    pub id: u32,
}
