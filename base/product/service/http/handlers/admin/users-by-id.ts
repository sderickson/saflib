import type { ResponseBody as getUsersByIdAdminResponseBody } from "@saflib/base-spec/operations/getUsersByIdAdmin";
import type { KratosIdentity } from "@saflib/base-spec/schemas/KratosIdentity";
import { createHandler, fetchKratosIdentityById } from "@saflib/express";
import createError from "http-errors";

/**
 * GET /admin/users/by-id?id= — site-admin Kratos identity lookup.
 */
export const getUsersByIdAdminHandler = createHandler(async (req, res) => {
  const id = String(req.query.id ?? "");
  const result = await fetchKratosIdentityById(id);

  if (!result.ok) {
    if (result.status === 404) {
      throw createError(404, "User not found");
    }
    throw createError(502, "Identity service error");
  }

  const response: getUsersByIdAdminResponseBody["getUsersByIdAdmin"][200] = {
    identity: result.identity as KratosIdentity,
  };
  res.status(200).json(response);
});
