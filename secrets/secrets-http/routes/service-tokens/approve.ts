import { createHandler } from "@saflib/express";
import type {
  SecretsServiceRequestBody,
  SecretsServiceResponseBody,
} from "@saflib/secrets-spec";
import createError from "http-errors";
import { secretsServiceStorage } from "@saflib/secrets-service-common";
import { serviceTokenQueries } from "@saflib/secrets-db";
import { mapServiceTokenToResponse } from "../_helpers.js";
import { getSafContextWithAuth } from "@saflib/node";

export const approveServiceTokensHandler = createHandler(async (req, res) => {
  const ctx = secretsServiceStorage.getStore()!;
  const data: SecretsServiceRequestBody["approveServiceToken"] = req.body || {};
  const id = req.params.id as string;
  const { auth } = getSafContextWithAuth();

  // Update the service token approval status
  const { result, error } = await serviceTokenQueries.updateApproval(
    ctx.secretsDbKey,
    {
      id,
      approved: data.approved,
      approvedBy: auth.userEmail ?? auth.userId.toString(),
    },
  );

  if (error) {
    switch (error.constructor.name) {
      case "ServiceTokenNotFoundError":
        throw createError(404, "Service token not found");
      default:
        throw error;
    }
  }

  // Map result to API response
  const response: SecretsServiceResponseBody["approveServiceToken"][200] =
    mapServiceTokenToResponse(result);

  res.status(200).json(response);
});
