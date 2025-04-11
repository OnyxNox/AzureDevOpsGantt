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
    models::{CliArguments, Configuration},
};

/// Application entry point.
#[tokio::main]
async fn main() -> Result<(), Box<dyn error::Error>> {
    let cli_arguments = CliArguments::parse();

    initialize_logger(&cli_arguments.log_level);

    info!("Welcome to the Azure DevOps Gantt tool!");

    let azure_dev_ops_client = AzureDevOpsClient::new(read_configuration());

    let work_item = azure_dev_ops_client
        .work_item(cli_arguments.root_work_item_id)
        .await?;

    info!("Work Item ID: {}", work_item.id);

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

/// Read in the configuration file.
fn read_configuration() -> Configuration {
    let configuration_file_path = "./.data/configuration.json";

    debug!(
        "Reading in the configuration file. File Path: {}",
        configuration_file_path
    );

    let configuration_file =
        File::open(configuration_file_path).expect("failed to open the configuration file");
    let configuration_file_reader = BufReader::new(configuration_file);

    let configuration = serde_json::from_reader(configuration_file_reader)
        .expect("failed to parse the configuration file");

    info!("Configuration file has been read in successfully!");

    configuration
}
