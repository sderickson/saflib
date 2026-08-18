import { createHandler } from "@saflib/express";
import type { ResponseBody } from "@saflib/dev-site-spec/operations/getCheckout";
import createError from "http-errors";
import { GitCommandError } from "@saflib/git";
import { getDevSiteHttpContext } from "../../context.ts";
import { getCheckoutStatus } from "../../checkout.ts";

export const getCheckoutHandler = createHandler(async (req, res) => {
  const { dbKey, repoRoot, productRoot, mainRef } = getDevSiteHttpContext();
  const compareRef =
    typeof req.query.compareRef === "string" ? req.query.compareRef : undefined;
  const { result, error } = await getCheckoutStatus(dbKey, {
    repoRoot,
    productRoot,
    mainRef,
    compareRef,
  });
  if (error) {
    switch (true) {
      case error instanceof GitCommandError:
        if (compareRef?.trim()) {
          throw createError(400, error.message, {
            code: "COMPARE_REF_NOT_FOUND",
          });
        }
        throw createError(500, error.message, { code: "GIT_COMMAND_FAILED" });
      default:
        throw error satisfies never;
    }
  }
  const response: ResponseBody["getCheckout"][200] = result;
  res.status(200).json(response);
});
