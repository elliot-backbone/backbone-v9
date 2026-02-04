/**
 * graph.js – Explicit DAG Definition (Phase 4.5.2)
 * 
 * Execution order is enforced by explicit dependency graph, not convention.
 * 
 * INVARIANT: No circular dependencies. Architecture enforces doctrine.
 * 
 * @module graph
 */

// =============================================================================
// COMPUTATION GRAPH (Phase 4.5.2)
// =============================================================================

/**
 * Dependency graph for Phase 4.5.2 pipeline.
 * Each node lists its dependencies.
 * 
 * Phase 4.5.2: Kill list compliance
 * - REMOVED: valueVector (shadow value surface)
 * - REMOVED: weeklyValue (shadow value surface)
 * - SINGLE RANKING SURFACE: actionRanker (via rankScore only)
 * 
 * DAG Order:
 * runway → metrics → trajectory → goalTrajectory → health → issues → 
 * preissues → ripple → actionCandidates → actionImpact → actionRanker
 */
export const GRAPH = {
  // L1: Base derivations (no deps)
  runway: [],
  metrics: [],
  meetings: [],
  
  // L2: Trajectory (can use metrics)
  trajectory: ['metrics'],
  
  // L3: Goal trajectory (goals + metrics + trajectory)
  goalTrajectory: ['metrics', 'trajectory'],
  
  // L4: Health (internal state only, depends on runway)
  health: ['runway'],
  
  // L5: Issues (gaps - depends on runway, trajectory, goalTrajectory)
  issues: ['runway', 'trajectory', 'goalTrajectory'],
  
  // L6: Pre-issues (forecasted - depends on runway, goalTrajectory, trajectory)
  preissues: ['runway', 'goalTrajectory', 'trajectory', 'metrics'],
  
  // L7: Ripple (downstream effects - depends on issues)
  ripple: ['issues'],
  
  // L8: Intro opportunities (network actions - depends on goalTrajectory for blocked goals)
  introOpportunity: ['goalTrajectory', 'issues'],
  
  // L9: Action candidates (from issues, preissues, goals, AND intros)
  actionCandidates: ['issues', 'preissues', 'goalTrajectory', 'introOpportunity'],
  
  // L10: Action impact (attach impact model, use ripple for leverage)
  actionImpact: ['actionCandidates', 'ripple'],
  
  // L11: Action ranker (rank by rankScore - single surface)
  actionRanker: ['actionImpact'],
  
  // L12: Priority view (compatibility layer over ranked actions)
  priority: ['actionRanker']
};

// =============================================================================
// TOPOLOGICAL SORT
// =============================================================================

/**
 * Perform topological sort on the dependency graph.
 * Detects cycles and throws on circular dependencies.
 * Produces stable ordering.
 * 
 * @param {Object} graph - Dependency graph (node -> dependencies[])
 * @returns {string[]} - Nodes in topological order
 * @throws {Error} - If cycle detected
 */
export function topoSort(graph) {
  const nodes = Object.keys(graph);
  const visited = new Set();
  const visiting = new Set();
  const order = [];
  
  function visit(node) {
    if (visited.has(node)) {
      return;
    }
    
    if (visiting.has(node)) {
      throw new Error(`DAG CYCLE DETECTED: ${node} is part of a circular dependency`);
    }
    
    visiting.add(node);
    
    const deps = graph[node] || [];
    for (const dep of deps) {
      if (!graph.hasOwnProperty(dep)) {
        throw new Error(`DAG ERROR: Unknown dependency '${dep}' in node '${node}'`);
      }
      visit(dep);
    }
    
    visiting.delete(node);
    visited.add(node);
    order.push(node);
  }
  
  // Visit all nodes (sorted for determinism)
  for (const node of nodes.sort()) {
    visit(node);
  }
  
  return order;
}

/**
 * Validate graph structure
 * @param {Object} graph 
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validateGraph(graph) {
  const errors = [];
  const nodes = new Set(Object.keys(graph));
  
  // Check all dependencies exist
  for (const [node, deps] of Object.entries(graph)) {
    for (const dep of deps) {
      if (!nodes.has(dep)) {
        errors.push(`Node '${node}' depends on unknown node '${dep}'`);
      }
    }
  }
  
  // Check for cycles
  try {
    topoSort(graph);
  } catch (e) {
    errors.push(e.message);
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Get the execution order for the standard graph
 * @returns {string[]}
 */
export function getExecutionOrder() {
  return topoSort(GRAPH);
}

/**
 * Get dependencies for a node
 * @param {string} node 
 * @returns {string[]}
 */
export function getDependencies(node) {
  return GRAPH[node] || [];
}

/**
 * Check if node A depends on node B (directly or transitively)
 * @param {string} nodeA 
 * @param {string} nodeB 
 * @returns {boolean}
 */
export function dependsOn(nodeA, nodeB) {
  const visited = new Set();
  
  function check(current) {
    if (current === nodeB) return true;
    if (visited.has(current)) return false;
    visited.add(current);
    
    const deps = GRAPH[current] || [];
    for (const dep of deps) {
      if (check(dep)) return true;
    }
    return false;
  }
  
  return check(nodeA);
}

export default {
  GRAPH,
  topoSort,
  validateGraph,
  getExecutionOrder,
  getDependencies,
  dependsOn
};
