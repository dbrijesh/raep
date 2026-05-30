'use strict';

/**
 * RapidX Knowledge Graph Query API
 * --------------------------------
 * Reads the codebase knowledge graph at `.rapidx/knowledge/graph.json` (built by
 * scripts/build-knowledge-graph.js) and answers impact/neighbourhood questions
 * using seed-then-expand BFS traversal. Zero dependencies.
 *
 * Used by agents (impact analysis before edits), the codebase-context hook
 * (inject relevant subgraph), and the /rapidx:knowledge-graph command.
 */

const fs = require('fs');
const path = require('path');

function loadGraph(cwd) {
  try {
    return JSON.parse(fs.readFileSync(path.join(cwd, '.rapidx', 'knowledge', 'graph.json'), 'utf8'));
  } catch {
    return null;
  }
}

function buildAdjacency(graph) {
  const adj = {};
  for (const n of graph.nodes) adj[n.id] = [];
  for (const e of (graph.edges || [])) {
    (adj[e.source] = adj[e.source] || []).push({ target: e.target, edge: e, dir: 'out' });
    (adj[e.target] = adj[e.target] || []).push({ target: e.source, edge: e, dir: 'in' });
  }
  return adj;
}

/**
 * Seed nodes whose id/label/file contains `term`, then BFS-expand `maxHops`.
 * @returns {{ term, nodes, edges, total_nodes, total_edges }}
 */
function query(cwd, term, opts = {}) {
  const maxHops = opts.maxHops || 2;
  const graph = loadGraph(cwd);
  if (!graph) return { error: 'No graph. Run /rapidx:knowledge-graph first.' };

  const lower = String(term || '').toLowerCase();
  const nodeMap = Object.fromEntries(graph.nodes.map(n => [n.id, n]));
  const adj = buildAdjacency(graph);

  const seeds = graph.nodes.filter(n =>
    n.id.toLowerCase().includes(lower) ||
    (n.label || '').toLowerCase().includes(lower) ||
    (n.file || '').toLowerCase().includes(lower)
  );

  const visited = new Set(seeds.map(n => n.id));
  const collected = [];
  const seen = new Set();
  let frontier = seeds.map(n => n.id);

  for (let h = 0; h < maxHops && frontier.length; h++) {
    const next = [];
    for (const id of frontier) {
      for (const entry of (adj[id] || [])) {
        const key = `${entry.edge.source}>${entry.edge.target}:${entry.edge.label}`;
        if (!seen.has(key)) { seen.add(key); collected.push(entry.edge); }
        if (!visited.has(entry.target)) { visited.add(entry.target); next.push(entry.target); }
      }
    }
    frontier = next;
  }

  return {
    term,
    seeds: seeds.map(n => n.id),
    nodes: [...visited].map(id => nodeMap[id]).filter(Boolean),
    edges: collected,
    total_nodes: visited.size,
    total_edges: collected.length,
  };
}

/**
 * Direct dependents/dependencies of a file (1 hop, direction-aware).
 */
function impact(cwd, fileId) {
  const graph = loadGraph(cwd);
  if (!graph) return { error: 'No graph. Run /rapidx:knowledge-graph first.' };
  const adj = buildAdjacency(graph);
  const dependents = [], dependencies = [];
  for (const entry of (adj[fileId] || [])) {
    if (entry.edge.label === 'imports') {
      if (entry.edge.target === fileId) dependents.push(entry.edge.source);
      else dependencies.push(entry.edge.target);
    }
  }
  return { file: fileId, dependents: [...new Set(dependents)], dependencies: [...new Set(dependencies)] };
}

function status(cwd) {
  const graph = loadGraph(cwd);
  if (!graph) return { exists: false };
  return { exists: true, built: graph.built, generator: graph.generator, ...graph.stats, edges: (graph.edges || []).length };
}

module.exports = { loadGraph, query, impact, status, buildAdjacency };

// CLI: node graph-query.cjs <term>
if (require.main === module) {
  const term = process.argv[2] || '';
  process.stdout.write(JSON.stringify(query(process.cwd(), term), null, 2) + '\n');
}
