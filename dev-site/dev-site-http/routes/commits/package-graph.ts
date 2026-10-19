import { createHandler } from "@saflib/express";
import { GitCommandError } from "@saflib/git";
import type {
  ResponseBody,
  PathParams,
} from "@saflib/dev-site-spec/operations/getCommitPackageGraph";
import createError from "http-errors";
import { getDevSiteHttpContext } from "../../context.ts";
import { loadPackageGraph } from "../../package-graph.ts";

export const getCommitPackageGraphHandler = createHandler(async (req, res) => {
  const { repo_root, product_root } = getDevSiteHttpContext();
  const { hash } = req.params as PathParams["getCommitPackageGraph"];
  const { result, error } = loadPackageGraph(
    repo_root,
    hash,
    product_root ?? "",
  );
  if (error) {
    switch (true) {
      case error instanceof GitCommandError:
        throw createError(404, "Commit not found", {
          code: "COMMIT_NOT_FOUND",
        });
      default:
        throw error satisfies never;
    }
  }
  const response: ResponseBody["getCommitPackageGraph"][200] = {
    package_graph: result,
  };
  res.status(200).json(response);
});
