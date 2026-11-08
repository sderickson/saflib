import createError from "http-errors";
import { createHandler } from "@saflib/express";
import { getSafReporters } from "@saflib/node";
import type { OpsResponseBody } from "@saflib/ops-spec";
import {
  OpsTokenAlreadyRevokedError,
  OpsTokenNotFoundError,
  revokeToken,
} from "@saflib/ops-db";
import { opsServiceStorage } from "../context.ts";
import { mapOpsToken } from "./_helpers.ts";

export const revokeOpsTokenHandler = createHandler(async function (req, res) {
  const { dbKey } = opsServiceStorage.getStore()!;
  const id = String(req.params.id);
  const { result, error } = await revokeToken(dbKey, id);
  if (error) {
    switch (true) {
      case error instanceof OpsTokenNotFoundError:
        throw createError(404, "No ops token with that id");
      case error instanceof OpsTokenAlreadyRevokedError:
        throw createError(409, "Ops token already revoked");
      default:
        throw error satisfies never;
    }
  }
  getSafReporters().log.info("ops token revoked", { opsTokenId: id });
  const response: OpsResponseBody["revokeOpsToken"][200] = {
    ops_token: mapOpsToken(result),
  };
  res.status(200).json(response);
});
