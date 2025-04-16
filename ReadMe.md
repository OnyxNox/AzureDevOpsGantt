# Azure DevOps Gantt (A-DOG)

The **Azure DevOps Gantt (A-DOG)** tool is used to generate a [Mermaid JS](https://mermaid.js.org/) [Gantt Diagram](https://mermaid.js.org/syntax/gantt.html) from a work item(s) and their children.

## To Dos

- [ ] Fix Gantt diagram's width so it fills the browser window's viewport dynamically, right now it has a static width.
- [ ] Add a SVG viewer to allow for scrolling the diagrams, something similar to [GitHub's implementation](https://github.com/mermaid-js/mermaid?tab=readme-ov-file#gantt-chart-docs---live-editor).
- [ ] Add ability to provide number of resources assigned to the feature, and split the child work items in the Gantt diagram based on the count.
- [ ] Add ability to create resource-specific blockers to better assign child work items and/or give better timeline estimates with the circumstances.
- [ ] Add an automatic refresh feature so that the diagrams update as the feature is being set up.
- [ ] Allow sections to be defined in tags, where the section prefix is customizable i.e. Section:Orchestration.
- [ ] Add ability to override work item assignment rank, by default it will be by length descending.
- [ ] Update authentication to something more modern and move away from person access tokens.
- [ ] Allow user to customize the effort field referenced, like the Dependency Relation.
- [ ] Add ability for user to set the effort length. i.e. Day, Week, Month, etc.
- [ ] Sanitize titles with invalid characters for mermaid diagrams.
- [ ] Show error notifications when an error occurs with instructions on how to fix them.
- [ ] Setup an `xtask` workspace for pseudo-libman for web, GitHub page updates and any other build tasks that are needed.
- [ ] Allow user to have multiple contexts.
- [ ] Add ability for the feature to be built out in A-DOG, once done then click "Deploy" to create all of the child work items according to the structure defined.
- [ ] Allow user to change the sanitization replace character. Default will be an underscore (_).
- [ ] Scale font size of dependency chart based on effort, where the floor is the standard 16px font.
- [ ] Add a information panel on the right side, opposite of the control panel, to show extra details. Raw diagram text, raw selected work item, etc.

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