const DiagramType = Object.freeze({
    Dependency: "dependency",
    Gantt: "gantt",
});

const Settings = (function () {
    return {
        dependencyRelation: "Tests",
        selectedDiagramType: DiagramType.Gantt,
    };
})();