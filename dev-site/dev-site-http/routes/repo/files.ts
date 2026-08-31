import { createHandler } from "@saflib/express";
import type { ResponseBody, QueryParams } from "@saflib/dev-site-spec/operations/listRepoFiles";
import createError from "http-errors";
import { existsSync, readdirSync, statSync } from "node:fs";
import { resolve, sep } from "node:path";
import { GitCommandError, listTree, readBlobs, resolveRef } from "@saflib/git";
import { getDevSiteHttpContext } from "../../context.ts";
import { readWorkingTreeFile } from "./file.ts";
import { matchesPathPrefix } from "../../repo-path-prefix.ts";

function normalizePrefix(prefix: string | undefined): string {
  if (!prefix) return "";
  return prefix.replace(/^\/+|\/+$/g, "");
}

/** Accept repeated `ext` query values and/or comma-separated lists. */
function parseExts(ext: unknown): string[] {
  if (ext === undefined || ext === null) return [];
  const parts = Array.isArray(ext) ? ext : [ext];
  const out: string[] = [];
  for (const part of parts) {
    for (const raw of String(part).split(",")) {
      const trimmed = raw.trim();
      if (!trimmed) continue;
      out.push(trimmed.startsWith(".") ? trimmed : `.${trimmed}`);
    }
  }
  return out;
}

function matchesExt(path: string, exts: string[]): boolean {
  if (exts.length === 0) return true;
  return exts.some((e) => path.endsWith(e));
}

function parseBool(value: unknown): boolean {
  if (value === true || value === "true" || value === "1") return true;
  if (Array.isArray(value)) return parseBool(value[0]);
  return false;
}

function isUnderRepoRoot(repo_root: string, abs: string): boolean {
  const root = resolve(repo_root);
  return abs === root || abs.startsWith(root + sep);
}

/** Files in the prefix's parent directory that match the stem/dir prefix. */
function listWorkingTreePrefixFiles(
  repo_root: string,
  prefix: string,
): string[] {
  if (!prefix) return [];
  const lastSlash = prefix.lastIndexOf("/");
  const dirRel = lastSlash === -1 ? "" : prefix.slice(0, lastSlash);
  const root = resolve(repo_root);
  const absDir = dirRel ? resolve(root, dirRel) : root;
  if (!isUnderRepoRoot(repo_root, absDir) || !existsSync(absDir)) return [];
  if (!statSync(absDir).isDirectory()) return [];
  const out: string[] = [];
  for (const name of readdirSync(absDir)) {
    const rel = dirRel ? `${dirRel}/${name}` : name;
    if (!matchesPathPrefix(rel, prefix)) continue;
    const abs = resolve(absDir, name);
    if (!statSync(abs).isFile()) continue;
    out.push(rel);
  }
  return out;
}

export const listRepoFilesHandler = createHandler(async (req, res) => {
  const { repo_root } = getDevSiteHttpContext();
  const query = (req.query ?? {}) as NonNullable<QueryParams["listRepoFiles"]> & {
    ext?: string | string[];
    content?: string | boolean | string[];
  };
  const ref = query.ref;
  if (!ref) {
    throw createError(400, "ref is required", { code: "MISSING_REF" });
  }
  const prefix = normalizePrefix(
    typeof query.prefix === "string" ? query.prefix : undefined,
  );
  const exts = parseExts(query.ext);
  const includeContent = parseBool(query.content);
  if (includeContent && !prefix) {
    throw createError(400, "content=true requires prefix", {
      code: "MISSING_PREFIX",
    });
  }

  const { result, error } = listTree(repo_root, ref);
  if (error) {
    switch (true) {
      case error instanceof GitCommandError:
        throw createError(500, error.message, { code: "GIT_COMMAND_FAILED" });
      default:
        throw error satisfies never;
    }
  }

  const byPath = new Map<string, { path: string; blob_hash: string }>();
  for (const e of result) {
    if (!matchesPathPrefix(e.path, prefix) || !matchesExt(e.path, exts)) {
      continue;
    }
    byPath.set(e.path, { path: e.path, blob_hash: e.blobHash });
  }

  const head = resolveRef(repo_root, "HEAD");
  const tip = resolveRef(repo_root, ref);
  const atHead = !head.error && !tip.error && head.result === tip.result;
  if (atHead && prefix) {
    for (const rel of listWorkingTreePrefixFiles(repo_root, prefix)) {
      if (!matchesExt(rel, exts)) continue;
      if (!byPath.has(rel)) {
        byPath.set(rel, { path: rel, blob_hash: "" });
      }
    }
  }

  const files = [...byPath.values()].sort((a, b) =>
    a.path.localeCompare(b.path),
  );

  if (!includeContent) {
    const response: ResponseBody["listRepoFiles"][200] = { files };
    res.status(200).json(response);
    return;
  }

  const contents = new Map<string, string>();
  if (atHead) {
    for (const f of files) {
      const wt = readWorkingTreeFile(repo_root, f.path);
      if (wt != null) contents.set(f.path, wt);
    }
  }
  const missing = files
    .filter((f) => !contents.has(f.path) && f.blob_hash)
    .map((f) => f.blob_hash);
  if (missing.length) {
    const blobs = readBlobs(repo_root, missing);
    if (blobs.error) {
      switch (true) {
        case blobs.error instanceof GitCommandError:
          throw createError(500, blobs.error.message, {
            code: "GIT_COMMAND_FAILED",
          });
        default:
          throw blobs.error satisfies never;
      }
    }
    const hashToContent = blobs.result;
    for (const f of files) {
      if (contents.has(f.path) || !f.blob_hash) continue;
      const text = hashToContent.get(f.blob_hash);
      if (text != null) contents.set(f.path, text);
    }
  }

  const response: ResponseBody["listRepoFiles"][200] = {
    files: files.map((f) => ({
      ...f,
      content: contents.get(f.path) ?? "",
    })),
  };
  res.status(200).json(response);
});
