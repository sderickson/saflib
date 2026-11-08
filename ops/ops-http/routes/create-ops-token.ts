import createError from "http-errors";
import { createHandler } from "@saflib/express";
import { getSafContext, getSafReporters } from "@saflib/node";
import type { OpsRequestBody, OpsResponseBody } from "@saflib/ops-spec";
import { createToken } from "@saflib/ops-db";
import { opsServiceStorage } from "../context.ts";
import { mapOpsToken } from "./_helpers.ts";

export const createOpsTokenHandler = createHandler(async function (req, res) {
  const { dbKey } = opsServiceStorage.getStore()!;
  const body: OpsRequestBody["createOpsToken"] = req.body;
  const expiresAt = body.expires_at ? new Date(body.expires_at) : null;
  if (expiresAt && expiresAt.getTime() <= Date.now()) {
    throw createError(400, "expires_at must be in the future");
  }
  const { auth } = getSafContext();
  const { result, error } = await createToken(dbKey, {
    name: body.name,
    scopes: body.scopes,
    createdBy: auth?.userId ?? null,
    expiresAt,
  });
  if (error) {
    switch (true) {
      default:
        throw error satisfies never;
    }
  }
  getSafReporters().log.info("ops token created", {
    opsTokenId: result.opsToken.id,
    scopes: result.opsToken.scopes.join(","),
  });
  const response: OpsResponseBody["createOpsToken"][201] = {
    ops_token: mapOpsToken(result.opsToken),
    token: result.token,
  };
  res.status(201).json(response);
});
