import fs from "node:fs";
import path from "node:path";
import type { SpaRouteCatalog, SpaRouteCatalogEntry } from "./analyze-router.ts";
import { sumGzipBytes } from "./gzip-bytes.ts";

export interface ViteManifestChunk {
  file?: string;
  src?: string;
  isEntry?: boolean;
  isDynamicEntry?: boolean;
  imports?: string[];
  dynamicImports?: string[];
  css?: string[];
}

export type ViteManifest = Record<string, ViteManifestChunk>;

export interface SpaRouteMeasure {
  routeKey: string;
  pathPattern: string;
  pageVueFiles: string[];
  pageChunksGzipBytes: number;
  pageChunksBytes: number;
}

export interface SpaShellMeasure {
  shellJsBytes: number;
  shellJsGzipBytes: number;
  shellCssGzipBytes: number;
  chunkCount: number;
  entryChunk?: string;
}

export interface SpaMeasureResult {
  spa: string;
  shell: SpaShellMeasure;
  routes: SpaRouteMeasure[];
}

function loadManifest(distDir: string): ViteManifest | undefined {
  const manifestPath = path.join(distDir, ".vite", "manifest.json");
  if (!fs.existsSync(manifestPath)) return undefined;
  return JSON.parse(fs.readFileSync(manifestPath, "utf8")) as ViteManifest;
}

function manifestKeyForSpaEntry(spa: string): string {
  return `${spa}/index.html`;
}

/** Walk static manifest imports recursively. */
function collectStaticClosure(
  manifest: ViteManifest,
  startKeys: string[],
): Set<string> {
  const seen = new Set<string>();
  const queue = [...startKeys];
  while (queue.length > 0) {
    const key = queue.pop()!;
    if (seen.has(key)) continue;
    seen.add(key);
    const chunk = manifest[key];
    if (!chunk?.imports) continue;
    for (const imp of chunk.imports) {
      if (!seen.has(imp)) queue.push(imp);
    }
  }
  return seen;
}

function chunkFilesForKeys(
  manifest: ViteManifest,
  keys: Set<string>,
): string[] {
  const files: string[] = [];
  for (const key of keys) {
    const file = manifest[key]?.file;
    if (file) files.push(file);
  }
  return files;
}

function manifestKeyForPageVue(
  manifest: ViteManifest,
  root: string,
  pageVueRepoPath: string,
): string | undefined {
  const buildDir = path.join(root, "daemon/clients/build");
  const relFromBuild = path.relative(buildDir, path.join(root, pageVueRepoPath));
  const posix = relFromBuild.replace(/\\/g, "/");
  for (const [key, chunk] of Object.entries(manifest)) {
    if (key === posix || chunk.src === posix) return key;
    if (key.endsWith(pageVueRepoPath) || (chunk.src && chunk.src.endsWith(pageVueRepoPath))) {
      return key;
    }
  }
  return undefined;
}

function measurePageChunkClosure(
  manifest: ViteManifest,
  root: string,
  pageVueRepoPaths: string[],
  shellKeys: Set<string>,
): { bytes: number; gzipBytes: number } {
  const pageOnlyKeys = new Set<string>();
  for (const pagePath of pageVueRepoPaths) {
    const mk = manifestKeyForPageVue(manifest, root, pagePath);
    if (!mk) continue;
    const closure = collectStaticClosure(manifest, [mk]);
    for (const k of closure) {
      if (!shellKeys.has(k)) pageOnlyKeys.add(k);
    }
  }
  const distDir = path.join(root, "daemon/clients/build/dist");
  const files = chunkFilesForKeys(manifest, pageOnlyKeys);
  return sumGzipBytes(distDir, files);
}

export function measureSpaFromManifest(
  root: string,
  spa: string,
  catalog: SpaRouteCatalog,
  distDir = path.join(root, "daemon/clients/build/dist"),
): SpaMeasureResult | undefined {
  const manifest = loadManifest(distDir);
  if (!manifest) return undefined;

  const entryKey = manifestKeyForSpaEntry(spa);
  const entry = manifest[entryKey];
  if (!entry) return undefined;

  const shellKeys = collectStaticClosure(manifest, [entryKey]);
  const shellFiles = chunkFilesForKeys(manifest, shellKeys);
  const shellJs = sumGzipBytes(distDir, shellFiles.filter((f) => f.endsWith(".js")));

  let shellCssGzip = 0;
  for (const key of shellKeys) {
    const css = manifest[key]?.css ?? [];
    for (const c of css) {
      shellCssGzip += sumGzipBytes(distDir, [c]).gzipBytes;
    }
  }

  const routes: SpaRouteMeasure[] = [];
  for (const route of catalog.routes) {
    const pagePaths = route.pageVueFiles;
    const incremental = measurePageChunkClosure(manifest, root, pagePaths, shellKeys);
    routes.push({
      routeKey: route.routeKey,
      pathPattern: route.pathPattern,
      pageVueFiles: pagePaths,
      pageChunksBytes: incremental.bytes,
      pageChunksGzipBytes: incremental.gzipBytes,
    });
  }

  return {
    spa,
    shell: {
      shellJsBytes: shellJs.bytes,
      shellJsGzipBytes: shellJs.gzipBytes,
      shellCssGzipBytes: shellCssGzip,
      chunkCount: shellFiles.length,
      entryChunk: entry.file,
    },
    routes,
  };
}

/** Merge nested route page targets along ancestor chains for leaf-style reporting. */
export function enrichRoutePageChains(catalog: SpaRouteCatalog): SpaRouteCatalog {
  // Re-analyze with ancestor chains — implemented in analyze-router; catalog already per-node.
  return catalog;
}

export function formatRouteCatalogEntry(e: SpaRouteCatalogEntry): string {
  return `${e.routeKey}  path=${e.pathPattern}  pages=${e.pageVueFiles.join(",")}`;
}
