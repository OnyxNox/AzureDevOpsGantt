# Azure DevOps Gantt (A-DOG)

The **Azure DevOps Gantt (A-DOG)** tool is used to generate a [Mermaid JS](https://mermaid.js.org/) [Gantt Diagram](https://mermaid.js.org/syntax/gantt.html) from a work item(s) and their children.

## To Dos

- [ ] Fix Gantt diagram's width so it fills the browser window's viewport dynamically, right now it has a static width.
- [ ] Add a SVG viewer to allow for scrolling the diagrams, something similar to [GitHub's implementation](https://github.com/mermaid-js/mermaid?tab=readme-ov-file#gantt-chart-docs---live-editor).
- [ ] Add ability to provide number of resources assigned to the feature, and split the child work items in the Gantt diagram based on the count.
- [ ] Add ability to create resource-specific blockers to better assign child work items and/or give better timeline estimates with the circumstances.
- [ ] Add ability to switch between child work item dependency graph and the Gantt diagram.
- [ ] Add an automatic refresh feature so that the diagrams update as the feature is being set up.
- [ ] Update authentication to something more modern and move away from person access tokens.
- [ ] Setup an `xtask` workspace for pseudo-libman for web and any other build tasks that are needed.
- [ ] Allow user to have multiple contexts.
- [ ] Both versions feature complete.

## Usage

### JavaScript Version

The JavaScript version is ideal for rapidly iterating while setting up a feature.

Navigate to this repository's [GitHub Page](https://onyxnox.github.io/AzureDevOpsGantt/) (recommended), or download the repository and open the [./docs/index.html](./docs/index.html) file in a web browser.

### Rust Version

The Rust version is ideal for tracking progress by scheduling regular snapshots while working on the feature.

Run the `cargo run` command below in a terminal at the root of the workspace.

```shell
cargo run -- --help
```

## Crates Used

- [Base64](https://github.com/marshallpierce/rust-base64) is a framework for encoding and decoding Base64 strings.
- [Chrono](https://github.com/chronotope/chrono) provides timezone-aware date and time operations.
- [Clap](https://github.com/clap-rs/clap) is a command-line argument parser.
- [Env Logger](https://github.com/rust-cli/env_logger) is a logger.
- [Log](https://github.com/rust-lang/log) is a logging facade.
- [Reqwest](https://github.com/seanmonstar/reqwest) is an ergonomic HTTP-client.
- [Serde](https://github.com/serde-rs/serde) is a framework for serializing and deserializing data structures.
- [Serde JSON](https://github.com/serde-rs/json) is a Serde extension that enables serializing and deserializing JSON format.
- [Tokio](https://github.com/tokio-rs/tokio) is an asynchronous runtime.
- [Tokio Macros](https://github.com/tokio-rs/tokio/tree/master/tokio-macros) are macros for use with Tokio.