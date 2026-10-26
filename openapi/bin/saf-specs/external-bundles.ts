import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  EXTERNAL_COMPONENTS_KEY,
  mergeExternalComponents,
} from "../../external-components.ts";
import { resolvePackageRoot } from "./resolve-pkg-refs.ts";

type Schemas = Record<string, unknown>;
export type BundleDoc = {
  components?: { schemas?: Schemas; [section: string]: unknown };
  [EXTERNAL_COMPONENTS_KEY]?: Record<string, string>;
  [key: string]: unknown;
};

const LOCAL_REF = /^#\/components\/schemas\/(.+)$/;

export type PackageJsonInfo = {
  name?: string;
  exports?: Record<string, unknown> | string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

export function readPackageJson(dir: string): PackageJsonInfo | undefined {
  try {
    return JSON.parse(
      readFileSync(path.join(dir, "package.json"), "utf8"),
    ) as PackageJsonInfo;
  } catch {
    return undefined;
  }
}

export function dependsOn(
  pj: PackageJsonInfo | undefined,
  name: string,
): boolean {
  if (!pj) return false;
  return [pj.dependencies, pj.devDependencies, pj.peerDependencies].some(
    (deps) => deps !== undefined && name in deps,
  );
}

/**
 * A package's complete bundle: its `dist/openapi.json` with any components it
 * left to other packages merged back in.
 */
export function loadMergedBundle(root: string): BundleDoc | undefined {
  const bundlePath = path.join(root, "dist", "openapi.json");
  if (!existsSync(bundlePath)) return undefined;
  const raw = JSON.parse(readFileSync(bundlePath, "utf8")) as BundleDoc;
  const external = raw[EXTERNAL_COMPONENTS_KEY];
  if (!external) return raw;
  const owners: Record<string, unknown> = {};
  for (const packageName of new Set(Object.values(external))) {
    owners[packageName] = loadMergedBundle(
      resolvePackageRoot(packageName, root),
    );
  }
  return mergeExternalComponents(raw, owners);
}

/**
 * Leave out of the bundle every schema component that a package it builds on
 * defines identically (same key, same JSON, and the same for everything it
 * references), recording the owner under {@link EXTERNAL_COMPONENTS_KEY}.
 * Only packages exporting `./json-spec` can own components, since the
 * generated `json-spec.ts` loads their complete documents to merge them back.
 */
export function omitExternalComponents(options: {
  bundled: BundleDoc;
  packageNames: Iterable<string>;
  cwd: string;
}): { slim: BundleDoc; owners: Map<string, string> } {
  const { bundled, cwd } = options;
  const ours = bundled.components?.schemas ?? {};
  const ownName = readPackageJson(cwd)?.name;
  const owners = new Map<string, string>();

  for (const packageName of [...new Set(options.packageNames)].sort()) {
    if (packageName === ownName) continue;
    let root: string;
    try {
      root = resolvePackageRoot(packageName, cwd);
    } catch {
      continue;
    }
    const pj = readPackageJson(root);
    if (!exportsJsonSpec(pj)) continue;
    if (ownName && dependsOn(pj, ownName)) continue;
    const theirs = loadMergedBundle(root)?.components?.schemas;
    if (!theirs) continue;

    const memo = new Map<string, boolean>();
    for (const key of Object.keys(ours).sort()) {
      if (owners.has(key)) continue;
      if (identicalComponent(key, ours, theirs, memo, new Set())) {
        owners.set(key, packageName);
      }
    }
  }

  if (owners.size === 0) return { slim: bundled, owners };
  const schemas: Schemas = {};
  for (const [key, value] of Object.entries(ours)) {
    if (!owners.has(key)) schemas[key] = value;
  }
  const sortedOwners = Object.fromEntries(
    [...owners].sort(([a], [b]) => a.localeCompare(b)),
  );
  return {
    slim: {
      ...bundled,
      components: { ...bundled.components, schemas },
      [EXTERNAL_COMPONENTS_KEY]: sortedOwners,
    },
    owners,
  };
}

function exportsJsonSpec(pj: PackageJsonInfo | undefined): boolean {
  const exports = pj?.exports;
  return (
    typeof exports === "object" && exports !== null && "./json-spec" in exports
  );
}

function identicalComponent(
  key: string,
  ours: Schemas,
  theirs: Schemas,
  memo: Map<string, boolean>,
  inProgress: Set<string>,
): boolean {
  const cached = memo.get(key);
  if (cached !== undefined) return cached;
  if (inProgress.has(key)) return true; // cycle: decided by the outer call
  if (!(key in ours) || !(key in theirs)) return false;
  if (JSON.stringify(ours[key]) !== JSON.stringify(theirs[key])) {
    memo.set(key, false);
    return false;
  }
  inProgress.add(key);
  const refs = new Set<string>();
  collectSchemaRefs(ours[key], refs);
  let result = true;
  for (const ref of refs) {
    if (!identicalComponent(ref, ours, theirs, memo, inProgress)) {
      result = false;
      break;
    }
  }
  inProgress.delete(key);
  memo.set(key, result);
  return result;
}

function collectSchemaRefs(value: unknown, refs: Set<string>): void {
  if (value === null || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const item of value) collectSchemaRefs(item, refs);
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (key === "$ref" && typeof child === "string") {
      const m = LOCAL_REF.exec(child);
      if (m) refs.add(m[1]!);
      continue;
    }
    collectSchemaRefs(child, refs);
  }
}

/** Source of the generated `dist/json-spec.ts`. */
export function jsonSpecModuleSource(ownerPackages: Iterable<string>): string {
  const packages = [...new Set(ownerPackages)].sort();
  const header = `/** Complete OpenAPI document for this package, e.g. for request/response validation. */\n`;
  if (packages.length === 0) {
    return `import { castJson } from "@saflib/openapi";
import * as json from "./openapi.json" with { type: "json" };

${header}export const jsonSpec = castJson(json);
`;
  }
  const imports = packages
    .map(
      (name, i) => `import { jsonSpec as owner${i} } from "${name}/json-spec";`,
    )
    .join("\n");
  const owners = packages
    .map((name, i) => `  ${JSON.stringify(name)}: owner${i},`)
    .join("\n");
  return `import { castJson } from "@saflib/openapi";
import { mergeExternalComponents } from "@saflib/openapi/external-components";
import * as json from "./openapi.json" with { type: "json" };
${imports}

${header}export const jsonSpec = castJson(
  mergeExternalComponents(json, {
${owners}
  }),
);
`;
}
