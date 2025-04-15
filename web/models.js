const DiagramType = Object.freeze({
    Dependency: "dependency",
    Gantt: "gantt",
});

const Settings = (function () {
    return {
        dependencyRelation: "Tests",
        resourceCount: 1,
        selectedDiagramType: DiagramType.Gantt,
    };
})();