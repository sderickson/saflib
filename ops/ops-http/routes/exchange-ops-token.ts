import createError from "http-errors";
import { createHandler } from "@saflib/express";
import { getSafReporters } from "@saflib/node";
import type { OpsRequestBody, OpsResponseBody } from "@saflib/ops-spec";
import { createToken, type OpsTokenScope } from "@saflib/ops-db";
import type { OpsCaller } from "../auth/ops-token-resolver.ts";
import { opsServiceStorage } from "../context.ts";
import { mapOpsToken } from "./_helpers.ts";

export const EXCHANGED_TOKEN_DEFAULT_SECONDS = 60 * 60;

/** Trade the calling token for a short-lived one (see the spec). */
export const exchangeOpsTokenHandler = createHandler(async function (req, res) {
  const { dbKey } = opsServiceStorage.getStore()!;
  const caller = res.locals.opsToken as OpsCaller;
  const body: OpsRequestBody["exchangeOpsToken"] = req.body ?? {};

  // Exchanged tokens never hold ops:exchange; this guards a hand-edited row.
  if (caller.exchangedFrom) {
    throw createError(403, "Exchanged tokens can't be exchanged again");
  }

  const grantable = caller.scopes.filter(
    (scope): scope is Exclude<OpsTokenScope, "ops:exchange"> => scope !== "ops:exchange",
  );
  const scopes = body.scopes ?? grantable;
  const notHeld = scopes.filter((scope) => !grantable.includes(scope));
  if (notHeld.length > 0) {
    throw createError(400, `The calling token doesn't hold: ${notHeld.join(", ")}`);
  }
  if (scopes.length === 0) {
    throw createError(400, "The calling token has no scopes to grant besides ops:exchange");
  }

  const lifetimeMs = (body.expires_in_seconds ?? EXCHANGED_TOKEN_DEFAULT_SECONDS) * 1000;
  let expiresAt = new Date(Date.now() + lifetimeMs);
  if (caller.expiresAt && caller.expiresAt < expiresAt) {
    expiresAt = caller.expiresAt;
  }

  const { result, error } = await createToken(dbKey, {
    name: caller.name,
    scopes,
    createdBy: null,
    expiresAt,
    exchangedFrom: caller.id,
  });
  if (error) {
    switch (true) {
      default:
        throw error satisfies never;
    }
  }
  getSafReporters().log.info("ops token exchanged", {
    opsTokenId: result.opsToken.id,
    exchangedFrom: caller.id,
    scopes: result.opsToken.scopes.join(","),
  });
  const response: OpsResponseBody["exchangeOpsToken"][201] = {
    ops_token: mapOpsToken(result.opsToken),
    token: result.token,
  };
  res.status(201).json(response);
});
