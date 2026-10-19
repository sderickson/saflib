/**
 * Package map: merge a product's package graph with its fork-point graph (in
 * compare mode) and lay it out as layer rows × feature lanes, ordering
 * packages within each box to reduce edge crossings.
 */

export interface GraphPackage {
  package_name: string;
  directory: string;
  kind: string;
  feature: string;
  core: boolean;
}

export interface GraphEdge {
  from: string;
  to: string;
  violation?: { rule: string; message: string };
}

export interface PackageGraphData {
  packages: GraphPackage[];
  edges: GraphEdge[];
}

export type GraphChange = "added" | "removed" | "changed";

export interface MapNode extends GraphPackage {
  /** Set in compare mode when the package differs from the fork point. */
  change?: GraphChange;
}

export interface MapEdge extends GraphEdge {
  id: string;
  change?: "added" | "removed";
}

export interface MergedGraph {
  nodes: MapNode[];
  edges: MapEdge[];
  /** True when compare mode found any package or dependency change. */
  hasChanges: boolean;
}

const edgeId = (e: GraphEdge) => `${e.from}\u0000${e.to}`;

/**
 * The head graph, or (with `base`) the union of head and fork point with each
 * package and dependency marked added, removed or changed.
 */
export function mergePackageGraphs(
  head: PackageGraphData,
  base?: PackageGraphData,
): MergedGraph {
  if (!base) {
    return {
      nodes: head.packages.map((p) => ({ ...p })),
      edges: head.edges.map((e) => ({ ...e, id: edgeId(e) })),
      hasChanges: false,
    };
  }
  const baseByName = new Map(base.packages.map((p) => [p.package_name, p]));
  const headByName = new Map(head.packages.map((p) => [p.package_name, p]));
  const headEdges = new Map(head.edges.map((e) => [edgeId(e), e]));
  const baseEdges = new Map(base.edges.map((e) => [edgeId(e), e]));

  const edges: MapEdge[] = [];
  for (const [id, e] of headEdges) {
    edges.push({ ...e, id, ...(baseEdges.has(id) ? {} : { change: "added" }) });
  }
  for (const [id, e] of baseEdges) {
    if (!headEdges.has(id)) edges.push({ ...e, id, change: "removed" });
  }

  const touched = new Set<string>();
  for (const e of edges) {
    if (e.change) {
      touched.add(e.from);
    }
  }

  const nodes: MapNode[] = [];
  for (const p of head.packages) {
    const before = baseByName.get(p.package_name);
    let change: GraphChange | undefined;
    if (!before) change = "added";
    else if (
      before.kind !== p.kind ||
      before.feature !== p.feature ||
      before.directory !== p.directory ||
      touched.has(p.package_name)
    ) {
      change = "changed";
    }
    nodes.push({ ...p, ...(change ? { change } : {}) });
  }
  for (const p of base.packages) {
    if (!headByName.has(p.package_name))
      nodes.push({ ...p, change: "removed" });
  }

  return {
    nodes,
    edges,
    hasChanges: nodes.some((n) => n.change) || edges.some((e) => e.change),
  };
}

/** Layer rows, top to bottom. Each row holds the kinds at that depth. */
export const LAYER_ROWS: Array<{ label: string; kinds: string[] }> = [
  { label: "Composition", kinds: ["app", "spa"] },
  { label: "App chrome · UI", kinds: ["http-app", "vue"] },
  { label: "Feature HTTP · SDK", kinds: ["http", "sdk"] },
  { label: "Shared HTTP · SDK common", kinds: ["http-common", "sdk-common"] },
  { label: "Domain", kinds: ["domain"] },
  { label: "Integrations", kinds: ["integration"] },
  { label: "Data · Contracts", kinds: ["db", "spec"] },
  { label: "Objects", kinds: ["objects"] },
  { label: "Unlayered", kinds: ["lib", "other"] },
  { label: "Tests", kinds: ["test"] },
];

const ROW_BY_KIND = new Map(
  LAYER_ROWS.flatMap((r, i) => r.kinds.map((k) => [k, i] as const)),
);

export function rowOfKind(kind: string): number {
  return ROW_BY_KIND.get(kind) ?? ROW_BY_KIND.get("other")!;
}

const CORE_LANE_ORDER = ["", "service", "clients"];

export function laneLabel(feature: string): string {
  return feature === "" ? "product root" : feature;
}

/** Core lanes first (product root, service, clients), then offshoots A–Z. */
export function orderLanes(nodes: GraphPackage[]): string[] {
  const features = [...new Set(nodes.map((n) => n.feature))];
  const core = new Set(nodes.filter((n) => n.core).map((n) => n.feature));
  const rank = (f: string) => {
    const i = CORE_LANE_ORDER.indexOf(f);
    return core.has(f) ? (i === -1 ? CORE_LANE_ORDER.length : i) : 100;
  };
  return features.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

export const LAYOUT = {
  nodeW: 176,
  nodeH: 30,
  gapX: 12,
  gapY: 10,
  lanePad: 16,
  laneGap: 24,
  rowPad: 14,
  rowGap: 28,
  labelW: 150,
  headerH: 56,
  maxPerLine: 4,
};

export interface PlacedNode extends MapNode {
  x: number;
  y: number;
  row: number;
  lane: number;
}

export interface GraphLayout {
  nodes: PlacedNode[];
  lanes: Array<{ feature: string; core: boolean; x: number; width: number }>;
  rows: Array<{ label: string; y: number; height: number }>;
  width: number;
  height: number;
}

/**
 * Place packages in layer rows × feature lanes. Within each box, packages are
 * ordered by the barycenter of their neighbours (a few up/down sweeps), which
 * keeps most dependency lines short and uncrossed.
 */
export function layoutPackageGraph(graph: MergedGraph): GraphLayout {
  const L = LAYOUT;
  const lanes = orderLanes(graph.nodes);
  const laneIndex = new Map(lanes.map((f, i) => [f, i]));
  const coreLanes = new Set(
    graph.nodes.filter((n) => n.core).map((n) => n.feature),
  );

  // Boxes: row × lane → node names, initially by directory.
  const cells = new Map<string, MapNode[]>();
  const cellKey = (r: number, l: number) => `${r}:${l}`;
  for (const n of [...graph.nodes].sort((a, b) =>
    a.directory.localeCompare(b.directory),
  )) {
    const key = cellKey(rowOfKind(n.kind), laneIndex.get(n.feature)!);
    cells.set(key, [...(cells.get(key) ?? []), n]);
  }

  // Lane widths and row heights from box sizes.
  const cols = (count: number) => Math.min(count, L.maxPerLine);
  const lines = (count: number) => Math.ceil(count / L.maxPerLine);
  const laneWidths = lanes.map((_, l) => {
    let most = 1;
    for (let r = 0; r < LAYER_ROWS.length; r++) {
      most = Math.max(most, cols(cells.get(cellKey(r, l))?.length ?? 0));
    }
    return most * L.nodeW + (most - 1) * L.gapX + 2 * L.lanePad;
  });
  const rowLines = LAYER_ROWS.map((_, r) => {
    let most = 0;
    for (let l = 0; l < lanes.length; l++) {
      most = Math.max(most, lines(cells.get(cellKey(r, l))?.length ?? 0));
    }
    return most;
  });

  const laneX: number[] = [];
  let x = L.labelW;
  for (const w of laneWidths) {
    laneX.push(x);
    x += w + L.laneGap;
  }
  const width = x - L.laneGap + L.lanePad;

  const rows: GraphLayout["rows"] = [];
  let y = L.headerH;
  for (let r = 0; r < LAYER_ROWS.length; r++) {
    const height =
      rowLines[r] === 0
        ? 0
        : rowLines[r]! * L.nodeH + (rowLines[r]! - 1) * L.gapY + 2 * L.rowPad;
    rows.push({ label: LAYER_ROWS[r]!.label, y, height });
    if (height > 0) y += height + L.rowGap;
  }
  const height = y;

  const pos = new Map<string, { x: number; y: number }>();
  const place = () => {
    for (const [key, list] of cells) {
      const [r, l] = key.split(":").map(Number) as [number, number];
      list.forEach((n, i) => {
        pos.set(n.package_name, {
          x: laneX[l]! + L.lanePad + (i % L.maxPerLine) * (L.nodeW + L.gapX),
          y:
            rows[r]!.y +
            L.rowPad +
            Math.floor(i / L.maxPerLine) * (L.nodeH + L.gapY),
        });
      });
    }
  };
  place();

  // Barycenter sweeps: sort each box by the mean x of its neighbours.
  const neighbours = new Map<string, string[]>();
  for (const e of graph.edges) {
    neighbours.set(e.from, [...(neighbours.get(e.from) ?? []), e.to]);
    neighbours.set(e.to, [...(neighbours.get(e.to) ?? []), e.from]);
  }
  for (let sweep = 0; sweep < 6; sweep++) {
    for (const list of cells.values()) {
      const score = new Map(
        list.map((n) => {
          const xs = (neighbours.get(n.package_name) ?? [])
            .map((m) => pos.get(m)?.x)
            .filter((v): v is number => v !== undefined);
          const own = pos.get(n.package_name)!.x;
          return [
            n.package_name,
            xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : own,
          ];
        }),
      );
      list.sort(
        (a, b) =>
          score.get(a.package_name)! - score.get(b.package_name)! ||
          a.directory.localeCompare(b.directory),
      );
    }
    place();
  }

  const nodes: PlacedNode[] = graph.nodes.map((n) => ({
    ...n,
    ...pos.get(n.package_name)!,
    row: rowOfKind(n.kind),
    lane: laneIndex.get(n.feature)!,
  }));

  return {
    nodes,
    lanes: lanes.map((feature, i) => ({
      feature,
      core: coreLanes.has(feature),
      x: laneX[i]!,
      width: laneWidths[i]!,
    })),
    rows,
    width,
    height,
  };
}

/** Names reachable from `start` along dependency edges (excluding `start`). */
export function transitiveDependencies(
  start: string,
  edges: GraphEdge[],
): Set<string> {
  const out = new Map<string, string[]>();
  for (const e of edges) out.set(e.from, [...(out.get(e.from) ?? []), e.to]);
  const seen = new Set<string>();
  const stack = [...(out.get(start) ?? [])];
  while (stack.length) {
    const next = stack.pop()!;
    if (next === start || seen.has(next)) continue;
    seen.add(next);
    stack.push(...(out.get(next) ?? []));
  }
  return seen;
}

/** `@scope/product-dossier-http` → `dossier-http` (drops the shared prefix). */
export function shortPackageName(name: string, allNames: string[]): string {
  const bare = (n: string) => n.replace(/^@[^/]+\//, "");
  const names = allNames.map(bare);
  let prefix = names[0] ?? "";
  for (const n of names) {
    while (prefix && !n.startsWith(prefix)) prefix = prefix.slice(0, -1);
  }
  prefix = prefix.slice(0, prefix.lastIndexOf("-") + 1);
  const b = bare(name);
  return prefix && b.startsWith(prefix) && b.length > prefix.length
    ? b.slice(prefix.length)
    : b;
}
