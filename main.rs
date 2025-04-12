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
    let cli_arguments = CliArguments::parse();

    initialize_logger(&cli_arguments.log_level);

    debug!("{:?}", cli_arguments);

    info!("Welcome to the Azure DevOps Gantt tool!");

    let azure_dev_ops_client =
        AzureDevOpsClient::new(read_context(&cli_arguments.context_file_path));

    let work_item = azure_dev_ops_client
        .work_item(cli_arguments.feature_work_item_id)
        .await?;

    if work_item.fields.work_item_type != "Feature" {
        error!(
            "Input work item (ID: {}) type must be of type 'Feature'. Work Item Type: {}",
            cli_arguments.feature_work_item_id, work_item.fields.work_item_type
        );

        return Ok(());
    }

    info!(
        "Generating Gantt diagram for the '{}' feature.",
        work_item.fields.title
    );

    for work_item_relation in work_item.relations {
        debug!("Related Work Item URL: {}", work_item_relation.url);
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

/// Read in the context file.
fn read_context(context_file_path: &PathBuf) -> Context {
    debug!(
        "Reading the context file. File Path: {}",
        context_file_path.display()
    );

    let context_file = File::open(context_file_path).expect("failed to open the context file");
    let context_file_reader = BufReader::new(context_file);

    let context =
        serde_json::from_reader(context_file_reader).expect("failed to parse the context file");

    info!("Context file has been read successfully!");

    context
}
