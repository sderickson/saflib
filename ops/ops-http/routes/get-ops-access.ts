import { createHandler } from "@saflib/express";
import { getSafContext } from "@saflib/node";
import type { OpsResponseBody } from "@saflib/ops-spec";

/** The caller's own access flags (public; anonymous callers get all false). */
export const getOpsAccessHandler = createHandler(async function (_req, res) {
  const auth = getSafContext().auth;
  const response: OpsResponseBody["getOpsAccess"][200] = {
    access: {
      signed_in: Boolean(auth),
      site_admin: auth?.isAdmin === true,
      mfa_completed: auth?.mfaCompleted === true,
    },
  };
  res.status(200).set("Cache-Control", "private, no-store").json(response);
});
