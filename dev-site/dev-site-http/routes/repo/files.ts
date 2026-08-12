import { createHandler } from "@saflib/express";
import type { ResponseBody, QueryParams } from "@saflib/dev-site-spec/operations/listRepoFiles";
import createError from "http-errors";
import { GitCommandError, listTree } from "@saflib/git";
import { getDevSiteHttpContext } from "../../context.ts";

function normalizePrefix(prefix: string | undefined): string {
  if (!prefix) return "";
  return prefix.replace(/^\/+|\/+$/g, "");
}

function matchesPrefix(path: string, prefix: string): boolean {
  if (!prefix) return true;
  return path === prefix || path.startsWith(prefix + "/");
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

export const listRepoFilesHandler = createHandler(async (req, res) => {
  const { repoRoot } = getDevSiteHttpContext();
  const query = (req.query ?? {}) as NonNullable<QueryParams["listRepoFiles"]> & {
    ext?: string | string[];
  };
  const ref = query.ref;
  if (!ref) {
    throw createError(400, "ref is required", { code: "MISSING_REF" });
  }
  const prefix = normalizePrefix(
    typeof query.prefix === "string" ? query.prefix : undefined,
  );
  const exts = parseExts(query.ext);

  const { result, error } = listTree(repoRoot, ref);
  if (error) {
    switch (true) {
      case error instanceof GitCommandError:
        throw createError(500, error.message, { code: "GIT_COMMAND_FAILED" });
      default:
        throw error satisfies never;
    }
  }

  const files = result
    .filter((e) => matchesPrefix(e.path, prefix) && matchesExt(e.path, exts))
    .map((e) => ({ path: e.path, blobHash: e.blobHash }));

  const response: ResponseBody["listRepoFiles"][200] = { files };
  res.status(200).json(response);
});
