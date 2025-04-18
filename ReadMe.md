# Azure DevOps Gantt

**Azure DevOps Gantt (A-DOG)** is a tool used to generate a [Mermaid JS](https://mermaid.js.org/) [Gantt Diagram](https://mermaid.js.org/syntax/gantt.html) from an Azure DevOps Feature work item and its children.

## Usage

Navigate to this repository's [GitHub Pages](https://onyxnox.github.io/AzureDevOpsGantt/) (recommended), or download the repository and open the [`./src/index.html`](./src/index.html) file in a web browser.

## To Dos

1. [ ] Allow user to create resource blockers that identify no progress will be made on assigned work items.
1. [ ] Allow user to enable an automatic refresh so that the diagram is updated as the Azure DevOps Feature is being updated.
1. [ ] Fix Gantt diagram's width so it fills the browser window's viewport dynamically; currently it has a static width.
1. [ ] Allow user to have multiple saved configurations (Context + Settings).
1. [ ] Add an information panel on the right side of the viewport to show additional details, such as the diagram's raw text, selected work item's raw response, etc.