import { createHandler } from "@saflib/express";
import type {
  SecretsServiceRequestBody,
  SecretsServiceResponseBody,
} from "@saflib/secrets-spec";
import createError from "http-errors";
import { secretsServiceStorage } from "@saflib/secrets-service-common";
import { accessRequest } from "@saflib/secrets-db";
import { mapAccessRequestToResponse } from "../_helpers.js";

export const approveAccessRequestHandler = createHandler(async (req, res) => {
  const ctx = secretsServiceStorage.getStore()!;
  const data: SecretsServiceRequestBody["approveAccessRequest"] =
    req.body || {};
  const id = req.params.id as string;

  // Get the access request first to check if it exists
  const { result: existingRequest, error: getError } =
    await accessRequest.getById(ctx.secretsDbKey, id);

  if (getError) {
    throw createError(404, "Access request not found");
  }

  if (!existingRequest) {
    throw createError(404, "Access request not found");
  }

  // Update the access request status
  const { result, error } = await accessRequest.updateStatus(ctx.secretsDbKey, {
    id,
    status: data.approved ? "granted" : "denied",
    grantedBy: data.approved_by,
  });

  if (error) {
    switch (error.constructor.name) {
      case "AccessRequestNotFoundError":
        throw createError(404, "Access request not found");
      default:
        throw error;
    }
  }

  // Map result to API response
  const response: SecretsServiceResponseBody["approveAccessRequest"][200] =
    mapAccessRequestToResponse(result);

  res.status(200).json(response);
});
