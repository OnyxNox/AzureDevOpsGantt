use std::path::PathBuf;

use clap::Parser;
use log::LevelFilter;
use serde::Deserialize;

/// Represents a generic response from a bulk endpoint.
#[derive(Debug, Deserialize)]
pub struct BulkResponse<T> {
    /// Collection of entities from a bulk endpoint.
    pub value: Vec<T>,
}

/// Welcome to Azure DevOps Gantt tool!
#[derive(Debug, Parser)]
#[command(version, about, long_about = None)]
pub struct CliArguments {
    /// Azure DevOps feature work item identifier.
    pub feature_work_item_id: u32,

    /// Set the Azure DevOps context's file path.
    #[arg(short, long = "context-path", default_value = "./.data/context.json")]
    pub context_file_path: PathBuf,

    /// Set the level of logging; sometimes referred to as "verbosity." Valid Values: off, error,
    /// warn, info, debug, trace
    #[arg(short, long, global = true, default_value_t = LevelFilter::Info)]
    pub log_level: LevelFilter,
}

/// Represents an Azure DevOps context file.
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

/// Represents a work item.
#[derive(Debug, Deserialize)]
pub struct WorkItem {
    /// Collection of work item fields.
    pub fields: WorkItemFields,

    /// Collection of related work items.
    pub relations: Vec<WorkItemRelation>,
}

/// Represents a collection of work item fields.
#[derive(Debug, Deserialize)]
pub struct WorkItemFields {
    /// Work item title.
    #[serde(rename = "System.Title")]
    pub title: String,

    /// Work item type.
    #[serde(rename = "System.WorkItemType")]
    pub work_item_type: String,
}

/// Represents a work item relationship.
#[derive(Debug, Deserialize)]
pub struct WorkItemRelation {
    /// Collection of work item relationship attributes.
    pub attributes: WorkItemRelationAttributes,

    /// Direct link to the related work item.
    pub url: String,
}

/// Represents a collection of work item relationship attributes.
#[derive(Debug, Deserialize)]
pub struct WorkItemRelationAttributes {
    /// Work item relationship type.
    #[serde(rename = "name")]
    pub relation_type: String,
}
