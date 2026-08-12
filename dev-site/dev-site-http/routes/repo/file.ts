import { createHandler } from "@saflib/express";
import type { ResponseBody, QueryParams } from "@saflib/dev-site-spec/operations/getRepoFile";
import createError from "http-errors";
import { GitCommandError, listTree, readBlob } from "@saflib/git";
import { getDevSiteHttpContext } from "../../context.ts";

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
