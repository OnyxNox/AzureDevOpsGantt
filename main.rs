use std::io::Write;

use chrono::Utc;
use log::{LevelFilter, info, trace};

/// Application entry point.
fn main() {
    initialize_logger();

    info!("Welcome to the Azure DevOps Gantt tool!");
}

/// Initialize logger to be used throughout the application.
fn initialize_logger() {
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
        .filter_module(env!("CARGO_PKG_NAME"), LevelFilter::Trace)
        .filter_level(LevelFilter::Off)
        .init();

    trace!("Application logger has been initialized!");
}
