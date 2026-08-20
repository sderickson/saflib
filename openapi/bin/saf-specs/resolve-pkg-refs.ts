import { createRequire } from "node:module";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

export interface ExternalSchemaProvenance {
  /** npm package name that owns the schema (e.g. `@pathclerk/daemon-dossier-spec`). */
  packageName: string;
  /** Canonical schema export name (OpenAPI component id). */
  schemaName: string;
}

export interface PkgResolveResult {
  rewrittenEntryPath: string;
  tempDir: string;
  /** Component / fragment name → owning package. */
  externalSchemas: Map<string, ExternalSchemaProvenance>;
  cleanup: () => void;
}

function splitRef(ref: string): { resource: string; fragment: string } {
  const hash = ref.indexOf("#");
  if (hash === -1) return { resource: ref, fragment: "" };
  return { resource: ref.slice(0, hash), fragment: ref.slice(hash) };
}

function joinRef(resource: string, fragment: string): string {
  return fragment ? `${resource}${fragment}` : resource;
}

function resolvePackageRoot(packageName: string, fromCwd: string): string {
  const require = createRequire(path.join(fromCwd, "package.json"));
  try {
    return path.dirname(require.resolve(`${packageName}/package.json`));
  } catch {
    // Many spec packages omit `./package.json` from exports; use openapi.yaml.
  }
  try {
    return path.dirname(require.resolve(`${packageName}/openapi.yaml`));
  } catch {
    // fall through
  }
  // Last resort: walk node_modules from cwd
  let dir = fromCwd;
  for (;;) {
    const candidate = path.join(dir, "node_modules", ...packageName.split("/"));
    if (existsSync(path.join(candidate, "package.json"))) {
      return candidate;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error(
    `Could not resolve package root for ${packageName} from ${fromCwd}`,
  );
}

/**
 * Resolve `pkg:@scope/name/subpath` to an absolute filesystem path using the
 * generating package's node resolution (exports / node_modules).
 */
export function resolvePkgResource(
  pkgRefResource: string,
  fromCwd: string,
): { packageName: string; absolutePath: string } {
  const withoutPrefix = pkgRefResource.replace(/^pkg:/, "");
  if (!withoutPrefix.startsWith("@")) {
    throw new Error(
      `pkg: refs must use a scoped package name (got "${pkgRefResource}")`,
    );
  }
  // @scope/name/rest... → packageName=@scope/name, subpath=rest...
  const parts = withoutPrefix.split("/");
  if (parts.length < 2) {
    throw new Error(`Invalid pkg: ref "${pkgRefResource}"`);
  }
  const packageName = `${parts[0]}/${parts[1]}`;
  const subpath = parts.slice(2).join("/");
  const require = createRequire(path.join(fromCwd, "package.json"));
  const packageRoot = resolvePackageRoot(packageName, fromCwd);

  // Prefer package-root + subpath for source YAML/JSON (exports often map
  // `./schemas/*` to generated `dist/schemas/*/index.ts`).
  if (subpath && /\.(ya?ml|json)$/i.test(subpath)) {
    const candidate = path.join(packageRoot, subpath);
    if (existsSync(candidate)) {
      return { packageName, absolutePath: candidate };
    }
  }

  if (!subpath) {
    return { packageName, absolutePath: packageRoot };
  }

  const request = `${packageName}/${subpath}`;
  try {
    const absolutePath = require.resolve(request);
    if (existsSync(absolutePath)) {
      return { packageName, absolutePath };
    }
  } catch {
    // fall through
  }

  const candidate = path.join(packageRoot, subpath);
  if (existsSync(candidate)) {
    return { packageName, absolutePath: candidate };
  }

  throw new Error(
    `Failed to resolve ${pkgRefResource} (as ${request}) from ${fromCwd}`,
  );
}

function schemaNameFromComponentFragment(fragment: string): string | undefined {
  // #/components/schemas/DossierProfile or deeper pointers under that schema
  const m = fragment.match(/^#\/components\/schemas\/([^/~]+)/);
  return m?.[1];
}

/**
 * Find which components.schemas entry in an openapi.yaml points at `targetFile`
 * (via relative or absolute $ref resource).
 */
export function findSchemaNameForFile(
  openapiYamlPath: string,
  targetFile: string,
): string | undefined {
  if (!existsSync(openapiYamlPath)) return undefined;
  const doc = parseYaml(readFileSync(openapiYamlPath, "utf8")) as {
    components?: { schemas?: Record<string, { $ref?: string }> };
  };
  const schemas = doc.components?.schemas ?? {};
  const targetResolved = path.resolve(targetFile);
  const openapiDir = path.dirname(openapiYamlPath);

  for (const [name, schema] of Object.entries(schemas)) {
    const ref = schema?.$ref;
    if (!ref || typeof ref !== "string") continue;
    const { resource } = splitRef(ref);
    if (!resource || resource.startsWith("#") || resource.startsWith("pkg:")) {
      continue;
    }
    const resolved = path.isAbsolute(resource)
      ? path.resolve(resource)
      : path.resolve(openapiDir, resource);
    if (resolved === targetResolved) return name;
  }
  return undefined;
}

function packageRootFromResolvedFile(
  packageName: string,
  _absolutePath: string,
  fromCwd: string,
): string {
  return resolvePackageRoot(packageName, fromCwd);
}

function recordExternal(
  map: Map<string, ExternalSchemaProvenance>,
  packageName: string,
  schemaName: string,
): void {
  if (!schemaName) return;
  map.set(schemaName, { packageName, schemaName });
}

function walkRefs(
  value: unknown,
  visit: (ref: string) => string,
): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) {
    return value.map((item) => walkRefs(item, visit));
  }
  const record = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(record)) {
    if (key === "$ref" && typeof child === "string") {
      out[key] = visit(child);
    } else {
      out[key] = walkRefs(child, visit);
    }
  }
  return out;
}

function collectLocalFiles(entryAbs: string, packageRoot: string): string[] {
  const queue = [entryAbs];
  const seen = new Set<string>();
  const files: string[] = [];

  while (queue.length > 0) {
    const file = queue.pop()!;
    const resolved = path.resolve(file);
    if (seen.has(resolved)) continue;
    if (!resolved.startsWith(packageRoot)) continue;
    if (!existsSync(resolved)) continue;
    seen.add(resolved);
    files.push(resolved);

    const text = readFileSync(resolved, "utf8");
    const doc = parseYaml(text);
    walkRefs(doc, (ref) => {
      const { resource } = splitRef(ref);
      if (
        !resource ||
        resource.startsWith("#") ||
        resource.startsWith("pkg:") ||
        /^[a-z]+:\/\//i.test(resource)
      ) {
        return ref;
      }
      const next = path.isAbsolute(resource)
        ? path.resolve(resource)
        : path.resolve(path.dirname(resolved), resource);
      if (next.startsWith(packageRoot) && !seen.has(next)) {
        queue.push(next);
      }
      return ref;
    });
  }

  return files;
}

/**
 * Rewrite `pkg:` `$ref`s under a spec package to absolute filesystem paths and
 * collect cross-package schema provenance for type emit.
 */
export function rewritePkgRefs(options: {
  entryFile: string;
  cwd: string;
}): PkgResolveResult {
  const cwd = path.resolve(options.cwd);
  const entryAbs = path.resolve(cwd, options.entryFile);
  const packageRoot = cwd;
  const externalSchemas = new Map<string, ExternalSchemaProvenance>();
  const tempDir = mkdtempSync(path.join(tmpdir(), "saf-specs-"));
  const cleanup = () => {
    rmSync(tempDir, { recursive: true, force: true });
  };

  const localFiles = collectLocalFiles(entryAbs, packageRoot);
  // Always include entry even if parse failed to walk
  if (!localFiles.includes(entryAbs)) localFiles.push(entryAbs);

  const originalToTemp = new Map<string, string>();
  for (const fileAbs of localFiles) {
    const rel = path.relative(packageRoot, fileAbs);
    originalToTemp.set(fileAbs, path.join(tempDir, rel));
  }

  const rewriteRef = (ref: string, fromFile: string): string => {
    const { resource, fragment } = splitRef(ref);

    if (resource.startsWith("pkg:")) {
      const { packageName, absolutePath } = resolvePkgResource(resource, cwd);
      const schemaFromFrag = schemaNameFromComponentFragment(fragment);
      if (schemaFromFrag) {
        recordExternal(externalSchemas, packageName, schemaFromFrag);
      } else {
        // File-style pkg: ref — only treat as cross-package SoT when the
        // owning package declares a components.schemas entry for that file.
        const pkgRoot = packageRootFromResolvedFile(
          packageName,
          absolutePath,
          cwd,
        );
        const openapiPath = path.join(pkgRoot, "openapi.yaml");
        const lookedUp = findSchemaNameForFile(openapiPath, absolutePath);
        if (lookedUp) {
          recordExternal(externalSchemas, packageName, lookedUp);
        }
      }
      return joinRef(absolutePath, fragment);
    }

    if (
      !resource ||
      resource.startsWith("#") ||
      /^[a-z]+:\/\//i.test(resource)
    ) {
      return ref;
    }

    const absolute = path.isAbsolute(resource)
      ? path.resolve(resource)
      : path.resolve(path.dirname(fromFile), resource);
    // Local files must point at rewritten temp copies (they may contain pkg:).
    const target = originalToTemp.get(absolute) ?? absolute;
    return joinRef(target, fragment);
  };

  for (const fileAbs of localFiles) {
    const dest = originalToTemp.get(fileAbs)!;
    mkdirSync(path.dirname(dest), { recursive: true });

    if (!/\.(ya?ml|json)$/i.test(fileAbs)) {
      copyFileSync(fileAbs, dest);
      continue;
    }

    const doc = parseYaml(readFileSync(fileAbs, "utf8"));

    // Component aliases that only `$ref` a pkg: schema → provenance under local key
    const schemas = (doc as { components?: { schemas?: Record<string, unknown> } })
      ?.components?.schemas;
    if (schemas && typeof schemas === "object") {
      for (const [localName, schema] of Object.entries(schemas)) {
        const ref =
          schema &&
          typeof schema === "object" &&
          "$ref" in schema &&
          typeof (schema as { $ref: unknown }).$ref === "string"
            ? (schema as { $ref: string }).$ref
            : undefined;
        if (!ref?.startsWith("pkg:")) continue;
        const { resource, fragment } = splitRef(ref);
        const { packageName } = resolvePkgResource(resource, cwd);
        const schemaName =
          schemaNameFromComponentFragment(fragment) ?? localName;
        recordExternal(externalSchemas, packageName, schemaName);
        recordExternal(externalSchemas, packageName, localName);
      }
    }

    const rewritten = walkRefs(doc, (ref) => rewriteRef(ref, fileAbs));
    writeFileSync(dest, stringifyYaml(rewritten, { lineWidth: 0 }));
  }

  const entryRel = path.relative(packageRoot, entryAbs);
  return {
    rewrittenEntryPath: path.join(tempDir, entryRel),
    tempDir,
    externalSchemas,
    cleanup,
  };
}
