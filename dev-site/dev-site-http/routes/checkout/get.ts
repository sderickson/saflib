import { createHandler } from "@saflib/express";
import type { ResponseBody } from "@saflib/dev-site-spec/operations/getCheckout";
import createError from "http-errors";
import { GitCommandError } from "@saflib/git";
import { getDevSiteHttpContext } from "../../context.ts";
import { getCheckoutStatus } from "../../checkout.ts";

export const getCheckoutHandler = createHandler(async (req, res) => {
  const { dbKey, repo_root, product_root, mainRef } = getDevSiteHttpContext();
  const compare_ref =
    typeof req.query.compare_ref === "string" ? req.query.compare_ref : undefined;
  const { result, error } = await getCheckoutStatus(dbKey, {
    repo_root,
    product_root,
    mainRef,
    compare_ref,
  });
  if (error) {
    switch (true) {
      case error instanceof GitCommandError:
        if (compare_ref?.trim()) {
          throw createError(400, error.message, {
            code: "COMPARE_REF_NOT_FOUND",
          });
        }
        throw createError(500, error.message, { code: "GIT_COMMAND_FAILED" });
      default:
        throw error satisfies never;
    }
  }
  const ctx = getDevSiteHttpContext();
  const response: ResponseBody["getCheckout"][200] = {
    ...result,
    ...(ctx.github_repo ? { github_repo: ctx.github_repo } : {}),
  };
  res.status(200).json(response);
});
