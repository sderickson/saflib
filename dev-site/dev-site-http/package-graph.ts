/**
 * The product's package graph at a commit: packages (kind, feature) and the
 * runtime dependencies between them, with layer-rule violations flagged by the
 * same rules `saf-imports boundaries` enforces.
 */
import type { ReturnsError } from "@saflib/utils";
import type { GitCommandError } from "@saflib/git";
import {
  checkLayerEdge,
  featureInProduct,
  type LayerPackage,
} from "@saflib/imports/layers";
import {
  loadPackageManifests,
  type PackageManifest,
} from "./package-manifests.ts";

export interface PackageGraphNode {
  package_name: string;
  /** Directory relative to the product root. */
  directory: string;
  kind: string;
  feature: string;
  core: boolean;
}

export interface PackageGraphEdge {
  from: string;
  to: string;
  violation?: { rule: string; message: string };
}

export interface PackageGraph {
  hash: string;
  product_root: string;
  packages: PackageGraphNode[];
  edges: PackageGraphEdge[];
}

function trimSlashes(p: string): string {
  return p.replace(/^\/+|\/+$/g, "");
}

/** Build the graph from manifests already loaded for `hash`. */
export function buildPackageGraph(
  manifests: PackageManifest[],
  options: { hash: string; product_root: string },
): PackageGraph {
  const root = trimSlashes(options.product_root);
  const inProduct = manifests.filter(
    (m) =>
      m.directory !== root &&
      (root === "" ? m.directory !== "" : m.directory.startsWith(`${root}/`)),
  );
  const packages: PackageGraphNode[] = inProduct
    .map((m) => {
      const directory = root ? m.directory.slice(root.length + 1) : m.directory;
      const saf = m.json.saf as
        { kind?: unknown; feature?: unknown } | undefined;
      return {
        package_name: m.package_name,
        directory,
        kind: m.kind,
        ...featureInProduct(directory, saf?.feature),
      };
    })
    .sort((a, b) => a.directory.localeCompare(b.directory));

  const byName = new Map(packages.map((p) => [p.package_name, p]));
  const layerPackage = (p: PackageGraphNode): LayerPackage => ({
    name: p.package_name,
    kind: p.kind,
    feature: p.feature,
    core: p.core,
    productRoot: root || ".",
  });

  const edges: PackageGraphEdge[] = [];
  for (const m of inProduct) {
    const from = byName.get(m.package_name)!;
    for (const dep of Object.keys(m.json.dependencies ?? {}).sort()) {
      const to = byName.get(dep);
      if (!to || to.package_name === from.package_name) continue;
      const found = checkLayerEdge(
        layerPackage(from),
        layerPackage(to),
        undefined,
      );
      edges.push({
        from: from.package_name,
        to: to.package_name,
        ...(found
          ? { violation: { rule: found.rule, message: found.message } }
          : {}),
      });
    }
  }
  return { hash: options.hash, product_root: root, packages, edges };
}

export function loadPackageGraph(
  repo_root: string,
  hash: string,
  product_root: string,
): ReturnsError<PackageGraph, GitCommandError> {
  const manifests = loadPackageManifests(repo_root, hash);
  if (manifests.error) return { error: manifests.error };
  return {
    result: buildPackageGraph(manifests.result, { hash, product_root }),
  };
}
