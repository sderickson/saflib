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
  description?: string;
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
export const LAYER_ROWS: Array<{
  label: string;
  kinds: string[];
  /** What the layer is for and what it may import (shown on hover). */
  description: string;
}> = [
  {
    label: "Composition",
    kinds: ["app", "spa"],
    description:
      "Entry points that wire the product together. The app package (service/monolith) mounts every feature router, wires dependencies (secrets, integration clients) and boots the runtimes. SPAs compose the UI and import feature SDKs directly. May import anything.",
  },
  {
    label: "App chrome · UI",
    kinds: ["http-app", "vue"],
    description:
      "http-app builds the HTTP app shell: middleware order, the auth gate, and platform routers after the feature routers. vue packages hold Vue components shared by SPAs. http-app may import http-common and below; vue may import SDKs, specs and objects.",
  },
  {
    label: "Feature HTTP · SDK",
    kinds: ["http", "sdk"],
    description:
      "One pair per feature. http exports that feature's router, with handlers validated by its spec; sdk exports its typed API client and TanStack queries. Features never import another feature's http or sdk: shared code moves down a layer.",
  },
  {
    label: "Shared HTTP · SDK common",
    kinds: ["http-common", "sdk-common"],
    description:
      "Code that several feature packages share: route registration, org context and API mappers for http; the API client factory and query keys every SDK builds on.",
  },
  {
    label: "Domain",
    kinds: ["domain"],
    description:
      "Product logic below HTTP: the service context, pipelines, audit, jobs and cron. May use integrations, db and objects, but never API specs.",
  },
  {
    label: "Integrations",
    kinds: ["integration"],
    description:
      "Wrappers around third-party APIs with mockable clients. Client code (client.ts, calls/, bin/) never touches the database; product state an integration owns lives in its state/ folder. May import db and objects.",
  },
  {
    label: "Data · Contracts",
    kinds: ["db", "spec"],
    description:
      "db: Drizzle schemas and queries. spec: the OpenAPI contracts for the API. Both build only on objects, and nothing below HTTP imports a spec.",
  },
  {
    label: "Objects",
    kinds: ["objects"],
    description:
      "Business-object schemas shared by db, domain and spec code; specs alias them. May import only other objects packages.",
  },
  {
    label: "Unlayered",
    kinds: ["lib", "other"],
    description:
      "Packages not yet assigned a layer: shared libraries, tooling and build packages. The layer rules don't check them, and every layer except objects may import lib packages.",
  },
  {
    label: "Tests",
    kinds: ["test"],
    description:
      "Fixtures and test harnesses. Only test files may import them.",
  },
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
  /** Width of a lane collapsed while a package is selected. */
  collapsedW: 34,
};

export interface PlacedNode extends MapNode {
  x: number;
  y: number;
  row: number;
  lane: number;
  /** In a collapsed lane: not drawn. */
  hidden: boolean;
}

export interface GraphLayout {
  nodes: PlacedNode[];
  lanes: Array<{
    feature: string;
    core: boolean;
    x: number;
    width: number;
    collapsed: boolean;
  }>;
  rows: Array<{
    label: string;
    description: string;
    y: number;
    height: number;
  }>;
  width: number;
  height: number;
}

/**
 * Place packages in layer rows × feature lanes. Within each box, packages are
 * ordered by the barycenter of their neighbours (a few up/down sweeps over the
 * full graph), which keeps most dependency lines short and uncrossed. The
 * order never depends on `visible`, so focusing a package doesn't reshuffle.
 *
 * With `visible`, only those packages take up space: lanes left empty
 * collapse to a strip, empty rows to nothing, and other packages are marked
 * hidden (keeping their full-layout position, so they fade in place).
 */
export function layoutPackageGraph(
  graph: MergedGraph,
  options: { visible?: Set<string> } = {},
): GraphLayout {
  const L = LAYOUT;
  const lanes = orderLanes(graph.nodes);
  const laneIndex = new Map(lanes.map((f, i) => [f, i]));
  const coreLanes = new Set(
    graph.nodes.filter((n) => n.core).map((n) => n.feature),
  );

  // Boxes: row × lane → nodes, initially by directory.
  const cells = new Map<string, MapNode[]>();
  const cellKey = (r: number, l: number) => `${r}:${l}`;
  for (const n of [...graph.nodes].sort((a, b) =>
    a.directory.localeCompare(b.directory),
  )) {
    const key = cellKey(rowOfKind(n.kind), laneIndex.get(n.feature)!);
    cells.set(key, [...(cells.get(key) ?? []), n]);
  }

  /** Lane/row geometry and node positions for the given box contents. */
  const measure = (boxes: Map<string, MapNode[]>, collapsed: Set<string>) => {
    const cols = (count: number) => Math.min(count, L.maxPerLine);
    const lines = (count: number) => Math.ceil(count / L.maxPerLine);
    const laneWidths = lanes.map((feature, l) => {
      if (collapsed.has(feature)) return L.collapsedW;
      let most = 1;
      for (let r = 0; r < LAYER_ROWS.length; r++) {
        most = Math.max(most, cols(boxes.get(cellKey(r, l))?.length ?? 0));
      }
      return most * L.nodeW + (most - 1) * L.gapX + 2 * L.lanePad;
    });
    const laneX: number[] = [];
    let x = L.labelW;
    for (const w of laneWidths) {
      laneX.push(x);
      x += w + L.laneGap;
    }
    const rows: GraphLayout["rows"] = [];
    let y = L.headerH;
    for (let r = 0; r < LAYER_ROWS.length; r++) {
      let most = 0;
      for (let l = 0; l < lanes.length; l++) {
        if (collapsed.has(lanes[l]!)) continue;
        most = Math.max(most, lines(boxes.get(cellKey(r, l))?.length ?? 0));
      }
      const height =
        most === 0 ? 0 : most * L.nodeH + (most - 1) * L.gapY + 2 * L.rowPad;
      rows.push({
        label: LAYER_ROWS[r]!.label,
        description: LAYER_ROWS[r]!.description,
        y,
        height,
      });
      if (height > 0) y += height + L.rowGap;
    }
    const pos = new Map<string, { x: number; y: number }>();
    for (const [key, list] of boxes) {
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
    return {
      laneX,
      laneWidths,
      rows,
      pos,
      width: x - L.laneGap + L.lanePad,
      height: y,
    };
  };

  // Barycenter sweeps over the full graph fix each box's order.
  const neighbours = new Map<string, string[]>();
  for (const e of graph.edges) {
    neighbours.set(e.from, [...(neighbours.get(e.from) ?? []), e.to]);
    neighbours.set(e.to, [...(neighbours.get(e.to) ?? []), e.from]);
  }
  let full = measure(cells, new Set());
  for (let sweep = 0; sweep < 6; sweep++) {
    for (const list of cells.values()) {
      const score = new Map(
        list.map((n) => {
          const xs = (neighbours.get(n.package_name) ?? [])
            .map((m) => full.pos.get(m)?.x)
            .filter((v): v is number => v !== undefined);
          const own = full.pos.get(n.package_name)!.x;
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
    full = measure(cells, new Set());
  }

  const visible = options.visible;
  let shown = full;
  const collapsed = new Set<string>();
  if (visible) {
    const boxes = new Map<string, MapNode[]>();
    for (const [key, list] of cells) {
      boxes.set(
        key,
        list.filter((n) => visible.has(n.package_name)),
      );
    }
    for (const n of graph.nodes) collapsed.add(n.feature);
    for (const n of graph.nodes) {
      if (visible.has(n.package_name)) collapsed.delete(n.feature);
    }
    shown = measure(boxes, collapsed);
  }

  const nodes: PlacedNode[] = graph.nodes.map((n) => {
    const hidden = !!visible && !visible.has(n.package_name);
    return {
      ...n,
      ...(hidden ? full.pos : shown.pos).get(n.package_name)!,
      row: rowOfKind(n.kind),
      lane: laneIndex.get(n.feature)!,
      hidden,
    };
  });

  return {
    nodes,
    lanes: lanes.map((feature, i) => ({
      feature,
      core: coreLanes.has(feature),
      x: shown.laneX[i]!,
      width: shown.laneWidths[i]!,
      collapsed: collapsed.has(feature),
    })),
    rows: shown.rows,
    width: shown.width,
    height: shown.height,
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
