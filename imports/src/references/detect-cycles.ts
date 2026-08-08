import type { ReferenceGraph } from "./build-graph.ts";

/** One cycle as an ordered list of package names (last equals first). */
export type ReferenceCycle = string[];

function normalizeCycle(cycle: string[]): string {
  const nodes = cycle.slice(0, -1);
  let minIdx = 0;
  for (let i = 1; i < nodes.length; i++) {
    if (nodes[i]! < nodes[minIdx]!) minIdx = i;
  }
  const rotated = [...nodes.slice(minIdx), ...nodes.slice(0, minIdx)];
  return rotated.join("\0");
}

/**
 * Detect cycles in the package-level reference graph via DFS back-edges.
 */
export function detectReferenceCycles(graph: ReferenceGraph): ReferenceCycle[] {
  const WHITE = 0;
  const GRAY = 1;
  const BLACK = 2;
  const color = new Map<string, number>();
  for (const name of graph.keys()) color.set(name, WHITE);

  const stack: string[] = [];
  const seenKeys = new Set<string>();
  const cycles: ReferenceCycle[] = [];

  function dfs(node: string) {
    color.set(node, GRAY);
    stack.push(node);
    const nexts = graph.get(node)?.references ?? [];
    for (const next of nexts) {
      if (!graph.has(next)) continue;
      const c = color.get(next) ?? WHITE;
      if (c === GRAY) {
        const idx = stack.indexOf(next);
        if (idx >= 0) {
          const cycle = [...stack.slice(idx), next];
          const key = normalizeCycle(cycle);
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            cycles.push(cycle);
          }
        }
      } else if (c === WHITE) {
        dfs(next);
      }
    }
    stack.pop();
    color.set(node, BLACK);
  }

  const names = [...graph.keys()].sort();
  for (const name of names) {
    if (color.get(name) === WHITE) dfs(name);
  }

  cycles.sort((a, b) => a.join("\0").localeCompare(b.join("\0")));
  return cycles;
}
