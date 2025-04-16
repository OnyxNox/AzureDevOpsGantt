/**
 * Represents a dependency graph; used to map dependencies within a collection of entities.
 */
function DependencyGraph() {
    /**
     * Collection of nodes in the graph.
     */
    let nodes = [];

    /**
     * Add a new edge (relationship) between the given node indices in the dependency graph.
     * @param {number} nodeIndex Index of the node to be given a parent.
     * @param {number} parentNodeIndex Index of the node that is to be assigned as a parent.
     */
    this.addEdge = function (nodeIndex, parentNodeIndex) {
        nodes[nodeIndex].parentNodeIndices.push(parentNodeIndex);
    }

    /**
     * Add a new node with the given data to the dependency graph.
     * @param {any} data Data to be stored in the node.
     */
    this.addNode = function (data) {
        nodes.push({ data, parentNodeIndices: [] });
    }

    /**
     * Get collection of nodes in the graph.
     * @returns {[]} Collection of nodes in the graph.
     */
    this.getNodes = () => nodes;
}