/**
 * Built-in layer rules for `saf-imports boundaries`, derived from each
 * package's `saf.kind` and feature. See `saflib/plans/product-layering.md`.
 *
 * - **order:** a package imports only the kinds below its own.
 * - **siblings:** packages of the same kind in different features don't import
 *   each other; what they share moves down a layer. An offshoot may still use
 *   the core's packages below HTTP (decision D2).
 * - **core-offshoot:** the core never references an offshoot (D2), except
 *   SPAs, which compose the client side and import offshoot SDKs directly. The core
 *   db's schema index may re-export offshoot tables, since they share one
 *   database and one migration history; any feature's `objects` package may
 *   be shared.
 * - **test-dev-only:** `test` packages are imported only from test files.
 * - **integration-internals:** an integration's client code (`client.ts`,
 *   `calls/`, `bin/`) never touches the database; that goes in `state/`.
 * - **slice-spec:** spec, http and sdk packages pair up by directory
 *   (`<dir>/<prefix>http` and `<dir>/<prefix>sdk` serve `<dir>/<prefix>spec`).
 *   An http or sdk package imports operations, paths and the JSON spec only
 *   from its own spec; other specs' `schemas/*` stay importable.
 */
import fs from "node:fs";
import path from "node:path";
import type { PackageKind } from "@saflib/monorepo/package-kind";

export type LayerRule =
  | "order"
  | "siblings"
  | "core-offshoot"
  | "test-dev-only"
  | "integration-internals"
  | "slice-spec";

/** What each kind may import from the product (same-kind imports: see siblings). */
export const LAYER_IMPORTS: Partial<
  Record<PackageKind, readonly PackageKind[]>
> = {
  "http-app": ["http-common", "domain", "integration", "db", "spec", "objects"],
  http: ["http-common", "domain", "integration", "db", "spec", "objects"],
  "http-common": ["domain", "integration", "db", "spec", "objects"],
  domain: ["integration", "db", "objects"],
  integration: ["db", "objects"],
  db: ["objects"],
  spec: ["objects"],
  objects: [],
  spa: ["vue", "sdk", "sdk-common", "spec", "objects"],
  vue: ["sdk", "sdk-common", "spec", "objects"],
  sdk: ["sdk-common", "spec", "objects"],
  "sdk-common": ["spec", "objects"],
};

/** Kinds whose packages may import anything (composition root, test harnesses). */
const UNRESTRICTED_KINDS = new Set<string>(["app", "test"]);

/** Kinds not yet assigned a layer: never checked, importable by any layer but objects. */
const UNCHECKED_KINDS = new Set<string>(["lib", "other"]);

/** Same-kind imports an offshoot may make into the core (D2). */
const SHARED_FROM_CORE = new Set<string>([
  "domain",
  "integration",
  "db",
  "spec",
  "objects",
]);

/** Where siblings' shared code goes, for messages. */
const SHARED_HOME: Record<string, string> = {
  http: "http-common",
  "http-app": "http-common",
  sdk: "sdk-common",
  vue: "a core vue package or sdk-common",
  spa: "vue or sdk",
};

/**
 * Features that make up the product's core: the server tree (`service/`), the
 * client tree (`clients/`) and packages directly in the product root (`""`).
 */
const CORE_FEATURES = new Set(["", "service", "clients"]);

export interface LayerPackage {
  name: string;
  kind?: string;
  /** Feature id (`service`, `dossier`, …; `""` for product-root packages). */
  feature: string;
  /** The product's core: `service/`, `clients/` and product-root packages. */
  core: boolean;
  /**
   * Absolute product root (nearest ancestor with a `service/` directory).
   * Layer rules only apply between packages of the same product; imports of
   * framework or other products' packages are not layered.
   */
  productRoot?: string;
  /** Absolute package directory, for pairing http and sdk packages with their spec. */
  dir?: string;
}

export interface LayerFinding {
  rule: LayerRule;
  key: string;
  message: string;
}

/** Nearest ancestor of `dir` (not `dir` itself) containing a `service/` folder of packages. */
function findProductRoot(dir: string, rootDir: string): string | undefined {
  let current = path.dirname(dir);
  for (;;) {
    const rel = path.relative(rootDir, current);
    if (rel.startsWith("..") || path.isAbsolute(rel)) return undefined;
    const candidate = path.join(current, "service");
    // A product's `service/` is a folder of packages, not a package itself.
    if (
      fs.existsSync(candidate) &&
      fs.statSync(candidate).isDirectory() &&
      !fs.existsSync(path.join(candidate, "package.json"))
    ) {
      return current;
    }
    if (current === rootDir) return undefined;
    current = path.dirname(current);
  }
}

/**
 * The feature of a package at `relativeDir` (posix, relative to its product
 * root): its first directory, or `""` directly in the product root, unless
 * `saf.feature` (`override`) names one. Pure, for callers that read packages
 * from somewhere other than the filesystem (e.g. a git commit).
 */
export function featureInProduct(
  relativeDir: string,
  override?: unknown,
): { feature: string; core: boolean } {
  if (typeof override === "string") {
    return { feature: override, core: CORE_FEATURES.has(override) };
  }
  const parts = relativeDir.split("/").filter(Boolean);
  const feature = parts.length > 1 ? parts[0]! : "";
  return { feature, core: CORE_FEATURES.has(feature) };
}

/**
 * A package's feature: the first directory under its product root (the
 * nearest ancestor with a `service/` directory), or `""` for packages directly
 * in the product root. `saf.feature` overrides it. Without a product root, the
 * package's parent directory is its feature, nothing is core, and layer
 * rules don't apply.
 */
export function resolveFeature(
  dir: string,
  rootDir: string,
  override?: unknown,
): { feature: string; core: boolean; productRoot?: string } {
  const productRoot = findProductRoot(dir, rootDir);
  if (productRoot && typeof override === "string") {
    return { productRoot, ...featureInProduct("", override) };
  }
  if (typeof override === "string") {
    return { feature: override, core: false };
  }
  if (!productRoot) {
    return {
      feature: path
        .relative(rootDir, path.dirname(dir))
        .split(path.sep)
        .join("/"),
      core: false,
    };
  }
  return {
    productRoot,
    ...featureInProduct(
      path.relative(productRoot, dir).split(path.sep).join("/"),
    ),
  };
}

function featureLabel(pkg: LayerPackage): string {
  return pkg.feature === "" ? "product root" : pkg.feature;
}

function finding(
  rule: LayerRule,
  from: string,
  to: string,
  message: string,
): LayerFinding {
  return { rule, key: `layer(${rule}): ${from} -> ${to}`, message };
}

/** Spec subpaths that are an API contract (as opposed to shared `schemas/*`). */
const SPEC_CONTRACT_RE = /^(?:operations(?:\/|$)|paths$|json-spec$)/;

/**
 * The spec directory an http or sdk package serves: `<dir>/<prefix>http` and
 * `<dir>/<prefix>sdk` pair with `<dir>/<prefix>spec`. Undefined when the
 * directory name doesn't end in `http` or `sdk`.
 */
export function pairedSpecDir(packageDir: string): string | undefined {
  const base = path.basename(packageDir);
  const match = /^(.*?)(http|sdk)$/.exec(base);
  if (!match) return undefined;
  return path.join(path.dirname(packageDir), `${match[1]}spec`);
}

/** Core db schema index re-exporting offshoot tables (`schema`, `schemas/*`). */
function isSchemaReexport(
  from: LayerPackage,
  to: LayerPackage,
  subpath: string | undefined,
): boolean {
  return (
    from.kind === "db" &&
    to.kind === "db" &&
    subpath !== undefined &&
    /^schemas?(?:\/|$)/.test(subpath)
  );
}

/**
 * The layer rule a runtime dependency `from` → `to` breaks, if any. `subpath`
 * is the imported path within `to` (undefined for a declared dependency with
 * no import yet).
 */
export function checkLayerEdge(
  from: LayerPackage,
  to: LayerPackage,
  subpath: string | undefined,
): LayerFinding | undefined {
  if (from.name === to.name) return undefined;
  if (!from.productRoot || from.productRoot !== to.productRoot)
    return undefined;
  const fromKind = from.kind;
  const toKind = to.kind;

  if (toKind === "test" && fromKind !== "test") {
    return finding(
      "test-dev-only",
      from.name,
      to.name,
      `${from.name} imports test package ${to.name} from runtime code; only test files may (list it in devDependencies)`,
    );
  }
  if (
    !fromKind ||
    UNCHECKED_KINDS.has(fromKind) ||
    UNRESTRICTED_KINDS.has(fromKind)
  ) {
    return undefined;
  }

  // Objects packages are shared vocabulary: a schema both need may live in
  // any feature's objects package (D2). SPAs compose the client side, the way
  // the app package composes the server: they import offshoot SDKs directly.
  if (
    from.core &&
    !to.core &&
    from.feature !== to.feature &&
    toKind !== "objects" &&
    fromKind !== "spa"
  ) {
    if (subpath === undefined && fromKind === "db" && toKind === "db") {
      return undefined; // decided by what is imported
    }
    if (isSchemaReexport(from, to, subpath)) return undefined;
    return finding(
      "core-offshoot",
      from.name,
      to.name,
      `${from.name} (core) must not import ${to.name} (feature ${featureLabel(to)}): the core never references an offshoot. Wire it in the composition root (an app package), or move the shared code into the core.`,
    );
  }

  if (
    (fromKind === "http" || fromKind === "sdk") &&
    toKind === "spec" &&
    subpath !== undefined &&
    SPEC_CONTRACT_RE.test(subpath) &&
    from.dir &&
    to.dir
  ) {
    const paired = pairedSpecDir(from.dir);
    if (paired && path.resolve(to.dir) !== path.resolve(paired)) {
      return finding(
        "slice-spec",
        from.name,
        to.name,
        `${from.name} imports ${to.name}/${subpath}, another slice's API contract. An ${fromKind} package serves only the spec beside it (${path.basename(paired)}); move the operation into that spec, or the handler or request into the slice that owns the operation. Schemas (\`schemas/*\`) from other specs are fine.`,
      );
    }
  }

  if (toKind && toKind === fromKind) {
    // The core is one feature, however its directories are split.
    if (from.feature === to.feature || (from.core && to.core)) return undefined;
    if (fromKind === "objects") return undefined;
    if (to.core && SHARED_FROM_CORE.has(fromKind)) return undefined;
    const home = SHARED_HOME[fromKind] ?? "the layer below";
    const why = to.core
      ? `offshoot ${fromKind} packages must not import the core's ${fromKind} package (D2)`
      : `both are ${fromKind} packages in different features (${featureLabel(from)}, ${featureLabel(to)})`;
    return finding(
      "siblings",
      from.name,
      to.name,
      `${from.name} must not import ${to.name}: ${why}. Move what they share to ${home}.`,
    );
  }

  const allowed = LAYER_IMPORTS[fromKind as PackageKind];
  if (!allowed) return undefined;
  if (!toKind) return undefined; // reported as missing-kind
  if (UNCHECKED_KINDS.has(toKind)) {
    if (fromKind !== "objects") return undefined;
  } else if ((allowed as readonly string[]).includes(toKind)) {
    return undefined;
  }
  const list =
    allowed.length > 0 ? allowed.join(", ") : "only other objects packages";
  return finding(
    "order",
    from.name,
    to.name,
    `${from.name} (${fromKind}) must not import ${to.name} (${toKind}): ${fromKind} packages may import ${list}. Move what it needs down into one of those layers.`,
  );
}

/** An integration package's client code: `client.ts`, `calls/**`, `bin/**`. */
export function isIntegrationClientFile(packageRelativePath: string): boolean {
  const p = packageRelativePath.split(path.sep).join("/");
  return /^(?:client\.[cm]?[jt]s|calls\/|bin\/)/.test(p);
}

/** Client code in an integration package importing the database or `state/`. */
export function checkIntegrationInternals(
  pkg: LayerPackage,
  packageRelativeFile: string,
  target: { packageKind?: string; packageName?: string; stateFile?: string },
): LayerFinding | undefined {
  if (pkg.kind !== "integration") return undefined;
  if (!isIntegrationClientFile(packageRelativeFile)) return undefined;
  const file = packageRelativeFile.split(path.sep).join("/");
  if (target.stateFile !== undefined) {
    return {
      rule: "integration-internals",
      key: `layer(integration-internals): ${pkg.name}/${file} -> ${target.stateFile}`,
      message: `${pkg.name}/${file} is client code and must not import ${target.stateFile}; only state/ reads and writes product tables.`,
    };
  }
  if (target.packageKind === "db" && target.packageName) {
    return {
      rule: "integration-internals",
      key: `layer(integration-internals): ${pkg.name}/${file} -> ${target.packageName}`,
      message: `${pkg.name}/${file} is client code and must not import ${target.packageName} (db); move the database access to state/.`,
    };
  }
  return undefined;
}
