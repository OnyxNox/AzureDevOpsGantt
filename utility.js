/**
 * Write setting to local storage and refresh diagram from local storage.
 * @param {string} key Settings field key.
 * @param {any} value Settings field value.
 */
async function cacheSetting(key, value) {
    Settings[key] = value;

    localStorage.setItem(Constants.localStorage.SETTINGS_KEY, JSON.stringify(Settings));

    const selectedDiagram = Settings.diagramType === DiagramType.Gantt
        ? localStorage.getItem(Constants.localStorage.GANTT_DIAGRAM_KEY)
        : localStorage.getItem(Constants.localStorage.DEPENDENCY_DIAGRAM_KEY);

    if (selectedDiagram) {
        document.getElementById(Constants.userInterface.MERMAID_DIAGRAM_OUTPUT_ELEMENT_ID)
            .innerHTML = (await mermaid.render("updatedGraph", selectedDiagram)).svg;
    }
}

/**
 * Get date string from a Date in the format of 'YYYY-MM-DD'.
 * @param {Date} date Input date.
 * @returns {String} Date string in the format of 'YYYY-MM-DD'.
 */
const getDateString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
};