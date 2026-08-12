import { createHandler } from "@saflib/express";
import type { ResponseBody, QueryParams } from "@saflib/dev-site-spec/operations/getRepoFile";
import createError from "http-errors";
import { existsSync, readFileSync } from "node:fs";
import { resolve, sep } from "node:path";
import { GitCommandError, listTree, readBlob, resolveRef } from "@saflib/git";
import { getDevSiteHttpContext } from "../../context.ts";

/** Read a repo-relative path from the working tree; null if missing or escapes root. */
export function readWorkingTreeFile(
  repoRoot: string,
  relPath: string,
): string | null {
  if (!relPath || relPath.includes("\0") || relPath.split("/").includes("..")) {
    return null;
  }
  const root = resolve(repoRoot);
  const abs = resolve(root, relPath);
  if (abs !== root && !abs.startsWith(root + sep)) return null;
  if (!existsSync(abs)) return null;
  return readFileSync(abs, "utf8");
}

export const getRepoFileHandler = createHandler(async (req, res) => {
  const { repoRoot } = getDevSiteHttpContext();
  const query = (req.query ?? {}) as NonNullable<QueryParams["getRepoFile"]>;
  const ref = query.ref;
  const path = query.path;
  if (!ref) {
    throw createError(400, "ref is required", { code: "MISSING_REF" });
  }
  if (!path) {
    throw createError(400, "path is required", { code: "MISSING_PATH" });
  }

  // At HEAD, prefer the working tree so live-dev scope docs (README / JSDoc /
  // package.json description) show up before they're committed.
  const head = resolveRef(repoRoot, "HEAD");
  const tip = resolveRef(repoRoot, ref);
  const atHead =
    !head.error && !tip.error && head.result === tip.result;
  if (atHead) {
    const wt = readWorkingTreeFile(repoRoot, path);
    if (wt != null) {
      const response: ResponseBody["getRepoFile"][200] = { path, content: wt };
      res.status(200).json(response);
      return;
    }
  }

  const tree = listTree(repoRoot, ref);
  if (tree.error) {
    switch (true) {
      case tree.error instanceof GitCommandError:
        throw createError(500, tree.error.message, {
          code: "GIT_COMMAND_FAILED",
        });
      default:
        throw tree.error satisfies never;
    }
  }

  const entry = tree.result.find((e) => e.path === path);
  if (!entry) {
    throw createError(404, `File not found: ${path}`, {
      code: "FILE_NOT_FOUND",
    });
  }

  const blob = readBlob(repoRoot, entry.blobHash);
  if (blob.error) {
    switch (true) {
      case blob.error instanceof GitCommandError:
        throw createError(500, blob.error.message, {
          code: "GIT_COMMAND_FAILED",
        });
      default:
        throw blob.error satisfies never;
    }
  }

  const response: ResponseBody["getRepoFile"][200] = {
    path,
    content: blob.result,
  };
  res.status(200).json(response);
});
