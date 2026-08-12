import { createHandler } from "@saflib/express";
import type { ResponseBody } from "@saflib/dev-site-spec/operations/getCheckout";
import createError from "http-errors";
import { GitCommandError } from "@saflib/git";
import { getDevSiteHttpContext } from "../../context.ts";
import { getCheckoutStatus } from "../../checkout.ts";

export const getCheckoutHandler = createHandler(async (_req, res) => {
  const { dbKey, repoRoot, productRoot } = getDevSiteHttpContext();
  const { result, error } = await getCheckoutStatus(dbKey, {
    repoRoot,
    productRoot,
  });
  if (error) {
    switch (true) {
      case error instanceof GitCommandError:
        throw createError(500, error.message, { code: "GIT_COMMAND_FAILED" });
      default:
        throw error satisfies never;
    }
  }
  const response: ResponseBody["getCheckout"][200] = result;
  res.status(200).json(response);
});
