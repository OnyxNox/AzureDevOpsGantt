mod azure_dev_ops_client;
mod models;

use std::{
    error,
    fs::File,
    io::{BufReader, Write},
};

use chrono::Utc;
use clap::Parser;
use log::{LevelFilter, debug, info, trace};

use crate::{
    azure_dev_ops_client::AzureDevOpsClient,
    models::{CliArguments, Context},
};

/// Application entry point.
#[tokio::main]
async fn main() -> Result<(), Box<dyn error::Error>> {
    let cli_arguments = CliArguments::parse();

    initialize_logger(&cli_arguments.log_level);

    info!("Welcome to the Azure DevOps Gantt tool!");

    let azure_dev_ops_client = AzureDevOpsClient::new(read_context());

    let work_item = azure_dev_ops_client
        .work_item(cli_arguments.feature_work_item_id)
        .await?;

    info!(
        "Generating Gantt diagram for the '{}' {}.",
        work_item.fields.title, work_item.fields.work_item_type
    );

    for work_item_relation in work_item.relations {
        debug!("Related Work Item URL: {}", work_item_relation.url);
    }

    info!("Gantt diagram has been generated successfully!");
    info!("Jobs done.");

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
fn read_context() -> Context {
    let context_file_path = "./.data/context.json";

    debug!("Reading the context file. File Path: {}", context_file_path);

    let context_file = File::open(context_file_path).expect("failed to open the context file");
    let context_file_reader = BufReader::new(context_file);

    let context =
        serde_json::from_reader(context_file_reader).expect("failed to parse the context file");

    info!("Context file has been read successfully!");

    context
}
