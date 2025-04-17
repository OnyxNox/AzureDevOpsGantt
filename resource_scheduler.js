function Resource(startWorkItemId) {
    let assignedWorkItemEffort = 0;
    let assignedWorkItemId = startWorkItemId;

    this.assignWorkItem = (workItemId, workItemEffort) => {
        assignedWorkItemEffort = workItemEffort;
        assignedWorkItemId = workItemId;
    };

    this.getWorkItemEffort = () => assignedWorkItemEffort;

    this.getWorkItemId = () => assignedWorkItemId;

    this.tick = (tickEffort) =>
        assignedWorkItemEffort = Math.max(assignedWorkItemEffort - tickEffort, 0);

    this.updateAssignedWorkItemId = (workItemId) => assignedWorkItemId = workItemId;
}

function ResourceScheduler(resourceCount, featureStartId) {
    const resources = Array.from({ length: resourceCount }, () => new Resource(featureStartId));

    this.getAvailableResources = () =>
        resources.filter(resource => resource.getWorkItemEffort() <= 0);

    this.tick = (previousTickLeastEffortScheduledWorkItemId) => {
        const leastEffortResource = this.getUnavailableResources()
            .reduce((leastEffortResource, resource) =>
                resource.getWorkItemEffort() < leastEffortResource.getWorkItemEffort()
                    ? resource : leastEffortResource, resources[0]);

        this.getAvailableResources()
            .forEach(resource => resource.updateAssignedWorkItemId(previousTickLeastEffortScheduledWorkItemId));

        this.getUnavailableResources()
            .forEach(resource => resource.tick(leastEffortResource.getWorkItemEffort()));
    };

    this.getUnavailableResources = () =>
        resources.filter(resource => resource.getWorkItemEffort() > 0);
}