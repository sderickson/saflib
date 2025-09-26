import { createHandler } from "@saflib/express";
import type { SecretsServiceResponseBody } from "@saflib/secrets-spec";
import { secretsServiceStorage } from "@saflib/secrets-service-common";
import { serviceTokenQueries } from "@saflib/secrets-db";
import { mapServiceTokenToResponse } from "../_helpers.js";

export const listServiceTokensHandler = createHandler(async (req, res) => {
  const ctx = secretsServiceStorage.getStore()!;

  // Get query parameters for pagination and filtering
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
  const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

  // Handle boolean parameter - express-openapi-validator might convert this
  let approved: boolean | undefined = undefined;
  if (req.query.approved !== undefined) {
    approved = req.query.approved.toString().toLowerCase() === "true";
  }

  const serviceName = req.query.service_name as string | undefined;

  // Call the database query with parameters
  const { result, error } = await serviceTokenQueries.list(ctx.secretsDbKey, {
    limit,
    offset,
    approved,
    serviceName,
  });

  // Handle expected errors (none defined for list operation)
  if (error) {
    throw error satisfies never;
  }

  // Map database entities to API response format
  const response: SecretsServiceResponseBody["listServiceTokens"][200] =
    result.map(mapServiceTokenToResponse);

  res.status(200).json(response);
});
