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

/// Represents a context file.
#[derive(Debug, Deserialize)]
pub struct Context {
    /// Azure DevOps organization that work items are under.
    pub organization_name: String,

    /// Personal access token used to authenticate requests.
    pub personal_access_token: String,

    /// Azure DevOps organization's project that work items are under.
    pub project_name: String,

    /// Azure DevOps user's email address used to authenticate requests.
    pub user_email: String,
}

/// Represents a work item in Azure DevOps.
#[derive(Debug, Deserialize)]
pub struct WorkItem {
    /// Azure DevOps work item identifier.
    pub id: u32,
}
