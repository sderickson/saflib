import type { ResponseBody as getUsersByIdAdminResponseBody } from "@saflib/base-spec/operations/getUsersByIdAdmin";
import type { KratosIdentity } from "@saflib/base-spec/schemas/KratosIdentity";
import { createHandler } from "@saflib/express";
import createError from "http-errors";

function kratosAdminBaseUrl(): string {
  const raw = process.env.KRATOS_ADMIN_API_URL ?? "http://kratos:4434";
  return raw.replace(/\/$/, "");
}

/**
 * GET /admin/users/by-id?id= — site-admin Kratos identity lookup.
 */
export const getUsersByIdAdminHandler = createHandler(async (req, res) => {
  const id = String(req.query.id ?? "");
  const url = `${kratosAdminBaseUrl()}/admin/identities/${encodeURIComponent(id)}`;

  const kres = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  if (kres.status === 404) {
    throw createError(404, "User not found");
  }

  if (!kres.ok) {
    throw createError(502, "Identity service error");
  }

  const identity = (await kres.json()) as KratosIdentity;

  const response: getUsersByIdAdminResponseBody["getUsersByIdAdmin"][200] = {
    identity,
  };
  res.status(200).json(response);
});
