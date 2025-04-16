const DiagramType = Object.freeze({
    Dependency: "dependency",
    Gantt: "gantt",
});

const Settings = (function () {
    return {
        dependencyRelation: "Tests",
        effortField: "Microsoft.VSTS.Scheduling.RemainingWork",
        featureStartDateField: "Microsoft.VSTS.Scheduling.StartDate",
        priorityField: "Microsoft.VSTS.Common.Priority",
        resourceCount: 1,
        sanitizationReplacement: '_',
        titleField: "System.Title",
        selectedDiagramType: DiagramType.Gantt,
    };
})();