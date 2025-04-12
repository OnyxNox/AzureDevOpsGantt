mod azure_dev_ops_client;
mod extensions;
mod models;

use std::{
    error,
    fs::File,
    io::{BufReader, Write},
    path::PathBuf,
};

use chrono::Utc;
use clap::Parser;
use log::{LevelFilter, debug, error, info, trace};

use crate::{
    azure_dev_ops_client::AzureDevOpsClient,
    models::{CliArguments, Context},
};

/// Application entry point.
#[tokio::main]
async fn main() -> Result<(), Box<dyn error::Error>> {
    let mut cli_arguments = CliArguments::parse();

    let mut previous_log_level = None;
    if cli_arguments.log_responses && cli_arguments.log_level != LevelFilter::Trace {
        previous_log_level = Some(cli_arguments.log_level);

        cli_arguments.log_level = LevelFilter::Trace;
    }

    initialize_logger(&cli_arguments.log_level);

    if let Some(previous_log_level) = previous_log_level {
        trace!(
            "Log responses enabled but log level too low; set log level to TRACE. Previous Log Level: {}",
            previous_log_level
        );
    }

    debug!("{:?}", cli_arguments);

    info!("Welcome to the Azure DevOps Gantt tool!");

    let azure_dev_ops_client = AzureDevOpsClient::new(
        read_context(&cli_arguments.context_file_path),
        cli_arguments.log_responses,
    );

    let feature_work_item = azure_dev_ops_client
        .work_item(cli_arguments.feature_work_item_id)
        .await?;

    if feature_work_item.fields.work_item_type != "Feature" {
        error!(
            "Input work item (ID: {}) type must be of type 'Feature'. Work Item Type: {}",
            cli_arguments.feature_work_item_id, feature_work_item.fields.work_item_type
        );

        return Ok(());
    }

    info!(
        "Generating Gantt diagram for the '{}' feature.",
        feature_work_item.fields.title
    );

    let child_work_item_ids = feature_work_item
        .relations
        .iter()
        .filter(|work_item_relation| work_item_relation.attributes.relation_type == "Child")
        .map(|child_work_item| {
            child_work_item
                .url
                .split('/')
                .last()
                .expect("failed to get path's last segment")
                .parse()
                .expect("failed to parse path's last segment")
        })
        .collect::<Vec<_>>();

    info!(
        "Feature has {} child work item(s).",
        child_work_item_ids.len()
    );

    let child_work_items = azure_dev_ops_client
        .work_items(child_work_item_ids)
        .await?
        .value;

    for child_work_item in child_work_items {
        info!("Child Work Item Title: {}", child_work_item.fields.title);
    }

    info!("Gantt diagram has been generated successfully! Jobs done.");

    Ok(())
}

/// Initialize logger to be used throughout the application.
fn initialize_logger(level: &LevelFilter) {
    env_logger::Builder::new()
        .format(|buffer, record| {
            writeln!(
                buffer,
                "{} [{:<5}] {}",
                Utc::now().format("%Y-%m-%d %H:%M:%SZ"),
                record.level(),
                record.args(),
            )
        })
        .filter_module(env!("CARGO_PKG_NAME"), *level)
        .filter_level(LevelFilter::Off)
        .init();

    trace!("Application logger has been initialized!");
}

/// Read in the Azure DevOps context file.
fn read_context(context_file_path: &PathBuf) -> Context {
    debug!(
        "Reading the Azure DevOps context file. File Path: {}",
        context_file_path.display()
    );

    let context_file =
        File::open(context_file_path).expect("failed to open the Azure DevOps context file");
    let context_file_reader = BufReader::new(context_file);

    let context = serde_json::from_reader(context_file_reader)
        .expect("failed to parse the Azure DevOps context file");

    info!("Azure DevOps context file has been read successfully!");

    context
}
