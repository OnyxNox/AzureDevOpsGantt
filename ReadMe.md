# Azure DevOps Gantt (A-DOG)

The **Azure DevOps Gantt (A-DOG)** tool is used to generate a [Mermaid JS](https://mermaid.js.org/) [Gantt Diagram](https://mermaid.js.org/syntax/gantt.html) from a work item(s) and their children.

## To Dos

- [ ] Generate Gantt diagram based on feature start time, effort estimates and number of resources.
- [ ] Update authentication to something more modern and move away from person access tokens.
- [ ] Host JavaScript version on GitHub.io pages.
- [ ] Both versions feature complete.

## Usage

### JavaScript Version

Open the [web/index.html](./web/index.html) file in a web browser. This version can be used to rapidly iterate while setting up a feature.

### Rust Version

Run the `cargo run` command below in a terminal at the root of the workspace. This version can be used to track progress while working on the feature by scheduling regular snapshots.

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