const DiagramType = Object.freeze({
    Dependency: "dependency",
    Gantt: "gantt",
});

const Settings = (function () {
    return {
        selectedDiagramType: DiagramType.Gantt,
    };
})();