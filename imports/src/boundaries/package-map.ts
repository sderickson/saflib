/**
 * `saf-imports map`: the product's packages by layer and feature, and per
 * package what it imports from where. Plain text for people and agents, or
 * JSON.
 */
import type { GraphPackageInfo, PackageGraph } from "./check-boundaries.ts";

/** Layer rows, top to bottom (same order as the dev-site package map). */
export const MAP_LAYER_ROWS: Array<{ label: string; kinds: string[] }> = [
  { label: "Composition", kinds: ["app", "spa"] },
  { label: "App chrome / UI", kinds: ["http-app", "vue"] },
  { label: "Feature HTTP / SDK", kinds: ["http", "sdk"] },
  { label: "Shared HTTP / SDK common", kinds: ["http-common", "sdk-common"] },
  { label: "Domain", kinds: ["domain"] },
  { label: "Integrations", kinds: ["integration"] },
  { label: "Data / Contracts", kinds: ["db", "spec"] },
  { label: "Objects", kinds: ["objects"] },
  { label: "Unlayered", kinds: ["lib", "other"] },
  { label: "Tests", kinds: ["test"] },
];

const rowOf = (kind?: string) => {
  const i = MAP_LAYER_ROWS.findIndex((r) => r.kinds.includes(kind ?? "other"));
  return i === -1 ? MAP_LAYER_ROWS.length - 2 : i;
};

const CORE_ORDER = ["", "service", "clients"];
const featureRank = (p: GraphPackageInfo) =>
  p.core ? CORE_ORDER.indexOf(p.feature) : 100;

const featureLabel = (feature: string) => (feature === "" ? "root" : feature);

export function formatLines(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

export interface ProductMap {
  packages: Array<
    GraphPackageInfo & {
      /** Product packages this one imports at runtime. */
      uses: string[];
      /** Product packages that import this one at runtime. */
      usedBy: string[];
    }
  >;
}

/**
 * Product packages (those under a product root) with runtime import edges
 * between them. Pass `product` (a package name or directory prefix) when the
 * repo has several products.
 */
export function productMap(graph: PackageGraph): ProductMap {
  const inProduct = graph.packages.filter((p) => p.productRoot);
  const names = new Set(inProduct.map((p) => p.name));
  const uses = new Map<string, Set<string>>();
  const usedBy = new Map<string, Set<string>>();
  for (const e of graph.edges) {
    if (e.dev || !names.has(e.from) || !names.has(e.to)) continue;
    if (!uses.has(e.from)) uses.set(e.from, new Set());
    uses.get(e.from)!.add(e.to);
    if (!usedBy.has(e.to)) usedBy.set(e.to, new Set());
    usedBy.get(e.to)!.add(e.from);
  }
  return {
    packages: inProduct.map((p) => ({
      ...p,
      uses: [...(uses.get(p.name) ?? [])].sort(),
      usedBy: [...(usedBy.get(p.name) ?? [])].sort(),
    })),
  };
}

const shortName = (name: string) => name.replace(/^@[^/]+\//, "");

const pad = (s: string, n: number) => (s.length >= n ? `${s} ` : s.padEnd(n));

/** The whole product: one block per layer, packages by feature then size. */
export function formatProductMap(map: ProductMap): string {
  const out: string[] = [];
  const n = map.packages.length;
  out.push(
    `${n} product packages. Columns: feature, package, kind, runtime lines (test lines), →uses ←used-by (runtime imports between product packages).`,
  );
  const nameW =
    Math.max(...map.packages.map((p) => shortName(p.name).length), 10) + 2;
  MAP_LAYER_ROWS.forEach((row, i) => {
    const pkgs = map.packages
      .filter((p) => rowOf(p.kind) === i)
      .sort(
        (a, b) =>
          featureRank(a) - featureRank(b) ||
          a.feature.localeCompare(b.feature) ||
          b.sourceLines - a.sourceLines,
      );
    if (!pkgs.length) return;
    out.push("", row.label.toUpperCase());
    for (const p of pkgs) {
      out.push(
        "  " +
          pad(featureLabel(p.feature) + (p.core ? "*" : ""), 14) +
          pad(shortName(p.name), nameW) +
          pad(p.kind ?? "?", 12) +
          pad(
            `${formatLines(p.sourceLines)} (${formatLines(p.testLines)})`,
            16,
          ) +
          `→${p.uses.length} ←${p.usedBy.length}`,
      );
    }
  });
  out.push("", "* core feature.");
  const top = (
    label: string,
    list: typeof map.packages,
    value: (p: ProductMap["packages"][number]) => string,
  ) =>
    out.push(
      `${label}: ${list.map((p) => `${shortName(p.name)} ${value(p)}`).join(", ")}`,
    );
  out.push("");
  top(
    "Largest",
    [...map.packages].sort((a, b) => b.sourceLines - a.sourceLines).slice(0, 6),
    (p) => formatLines(p.sourceLines),
  );
  top(
    "Most used",
    [...map.packages]
      .sort((a, b) => b.usedBy.length - a.usedBy.length)
      .slice(0, 6),
    (p) => `←${p.usedBy.length}`,
  );
  top(
    "Most dependencies",
    [...map.packages].sort((a, b) => b.uses.length - a.uses.length).slice(0, 6),
    (p) => `→${p.uses.length}`,
  );
  out.push("", "Detail: saf-imports map --package <name>");
  return out.join("\n");
}

function topSubpaths(edges: PackageGraph["edges"], limit = 5): string {
  const counts = new Map<string, Set<string>>();
  for (const e of edges) {
    if (!counts.has(e.subpath)) counts.set(e.subpath, new Set());
    counts.get(e.subpath)!.add(e.file);
  }
  const sorted = [...counts].sort((a, b) => b[1].size - a[1].size);
  const shown = sorted
    .slice(0, limit)
    .map(([sub, files]) => `${sub} (${files.size})`)
    .join(", ");
  return sorted.length > limit
    ? `${shown}, … ${sorted.length - limit} more`
    : shown;
}

/** Directory of a package-relative file at `depth` levels (`handlers/matters`). */
function dirAt(file: string, depth: number): string {
  const parts = file.split("/");
  return parts.length <= 1
    ? "."
    : parts.slice(0, Math.min(depth, parts.length - 1)).join("/");
}

/** One package: what it imports, who imports it, and where its code is. */
export function formatPackageDetail(
  graph: PackageGraph,
  map: ProductMap,
  query: string,
  options: { depth?: number } = {},
): string {
  const pkg =
    map.packages.find((p) => p.name === query) ??
    map.packages.find((p) => shortName(p.name) === query) ??
    map.packages.find((p) => p.name.endsWith(query));
  if (!pkg) return `No product package matches "${query}".`;
  const depth = options.depth ?? 2;
  const productNames = new Set(map.packages.map((p) => p.name));
  const out: string[] = [];
  out.push(
    `${pkg.name}  ${pkg.kind ?? "?"} · feature ${featureLabel(pkg.feature)}${pkg.core ? " (core)" : ""} · ${pkg.relDir}`,
    `  runtime: ${pkg.sourceFiles} files, ${formatLines(pkg.sourceLines)} lines · tests/tooling: ${pkg.testFiles} files, ${formatLines(pkg.testLines)} lines`,
  );

  const outgoing = graph.edges.filter(
    (e) => e.from === pkg.name && productNames.has(e.to),
  );
  const byTarget = (edges: typeof outgoing, key: "to" | "from") => {
    const m = new Map<string, typeof outgoing>();
    for (const e of edges) {
      const k = e[key];
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(e);
    }
    return [...m].sort(
      (a, b) =>
        new Set(b[1].map((e) => e.file)).size -
        new Set(a[1].map((e) => e.file)).size,
    );
  };

  const runtimeOut = byTarget(
    outgoing.filter((e) => !e.dev),
    "to",
  );
  out.push(
    "",
    `Uses ${runtimeOut.length} product packages at runtime (files importing · top subpaths):`,
  );
  for (const [to, edges] of runtimeOut) {
    out.push(
      `  ${pad(shortName(to), 30)}${pad(String(new Set(edges.map((e) => e.file)).size), 5)}${topSubpaths(edges)}`,
    );
  }
  const devOnly = byTarget(
    outgoing.filter((e) => e.dev && !runtimeOut.some(([t]) => t === e.to)),
    "to",
  );
  if (devOnly.length) {
    out.push(`  tests only: ${devOnly.map(([t]) => shortName(t)).join(", ")}`);
  }
  const imported = new Set(outgoing.map((e) => e.to));
  const declaredUnused = pkg.dependencies.filter(
    (d) => productNames.has(d) && !imported.has(d),
  );
  if (declaredUnused.length) {
    out.push(
      `  declared but not imported: ${declaredUnused.map(shortName).join(", ")}`,
    );
  }

  const incoming = graph.edges.filter(
    (e) => e.to === pkg.name && productNames.has(e.from),
  );
  const users = byTarget(incoming, "from");
  out.push(
    "",
    `Used by ${users.length} product packages (files importing · top subpaths):`,
  );
  for (const [from, edges] of users) {
    const dev = edges.every((e) => e.dev) ? " (tests only)" : "";
    out.push(
      `  ${pad(shortName(from) + dev, 30)}${pad(String(new Set(edges.map((e) => e.file)).size), 5)}${topSubpaths(edges)}`,
    );
  }

  // What others import, by subpath: the package's real public surface, and
  // which parts only one consumer uses (candidates to move to that consumer).
  const subLines = new Map<string, number>();
  for (const [file, lines] of Object.entries(pkg.sourceFileLines)) {
    const key = file
      .replace(/\.(?:[cm]?[jt]sx?|vue)$/, "")
      .replace(/\/index$/, "")
      .split("/")
      .slice(0, 2)
      .join("/");
    subLines.set(key, (subLines.get(key) ?? 0) + lines);
  }
  const bySub = new Map<string, Map<string, number>>();
  for (const e of incoming) {
    if (e.dev) continue;
    const key = e.subpath.split("/").slice(0, 2).join("/");
    if (!bySub.has(key)) bySub.set(key, new Map());
    const users = bySub.get(key)!;
    users.set(shortName(e.from), (users.get(shortName(e.from)) ?? 0) + 1);
  }
  if (bySub.size) {
    out.push(
      "",
      "What others import, by subpath (lines · importing package (files)):",
    );
    const total = (m: Map<string, number>) =>
      [...m.values()].reduce((a, b) => a + b, 0);
    for (const [sub, users] of [...bySub].sort(
      (a, b) => total(b[1]) - total(a[1]),
    )) {
      out.push(
        `  ${pad(sub, 34)}${pad(subLines.has(sub) ? formatLines(subLines.get(sub)!) : "", 7)}${[
          ...users,
        ]
          .map(([u, n]) => `${u}(${n})`)
          .join(" ")}`,
      );
    }
  }

  // Where the code is, and what each part imports.
  const dirs = new Map<string, { lines: number; files: number }>();
  for (const [file, lines] of Object.entries(pkg.sourceFileLines)) {
    const d = dirAt(file, depth);
    const cur = dirs.get(d) ?? { lines: 0, files: 0 };
    dirs.set(d, { lines: cur.lines + lines, files: cur.files + 1 });
  }
  const pkgPrefix = `${pkg.relDir}/`;
  const dirDeps = new Map<string, Set<string>>();
  for (const e of outgoing) {
    if (e.dev || !e.file.startsWith(pkgPrefix)) continue;
    const d = dirAt(e.file.slice(pkgPrefix.length), depth);
    if (!dirDeps.has(d)) dirDeps.set(d, new Set());
    dirDeps.get(d)!.add(shortName(e.to));
  }
  const sortedDirs = [...dirs].sort((a, b) => b[1].lines - a[1].lines);
  out.push(
    "",
    `Runtime code by directory (depth ${depth}; lines · files · product packages it imports):`,
  );
  for (const [d, s] of sortedDirs.slice(0, 25)) {
    const deps = [...(dirDeps.get(d) ?? [])].sort();
    out.push(
      `  ${pad(d, 34)}${pad(formatLines(s.lines), 7)}${pad(String(s.files), 5)}${deps.join(", ") || "-"}`,
    );
  }
  if (sortedDirs.length > 25)
    out.push(`  … ${sortedDirs.length - 25} more directories`);
  return out.join("\n");
}
