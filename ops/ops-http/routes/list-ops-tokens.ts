import { createHandler } from "@saflib/express";
import type { OpsResponseBody } from "@saflib/ops-spec";
import { listTokens } from "@saflib/ops-db";
import { opsServiceStorage } from "../context.ts";
import { mapOpsToken } from "./_helpers.ts";

export const listOpsTokensHandler = createHandler(async function (_req, res) {
  const { dbKey } = opsServiceStorage.getStore()!;
  const { result, error } = await listTokens(dbKey);
  if (error) {
    switch (true) {
      default:
        throw error satisfies never;
    }
  }
  const response: OpsResponseBody["listOpsTokens"][200] = {
    ops_tokens: result.map(mapOpsToken),
  };
  res.status(200).json(response);
});
