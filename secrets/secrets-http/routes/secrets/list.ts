import { createHandler } from "@saflib/express";
import type { SecretsServiceResponseBody } from "@saflib/secrets-spec";
import { secretsServiceStorage } from "@saflib/secrets-service-common";
import { secretQueries } from "@saflib/secrets-db";
import { mapSecretToResponse } from "../_helpers.js";

export const listHandler = createHandler(async (req, res) => {
  const ctx = secretsServiceStorage.getStore()!;

  // Get query parameters for pagination and filtering
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
  const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

  // Handle boolean parameter - express-openapi-validator might convert this
  let isActive: boolean | undefined = undefined;
  if (req.query.is_active !== undefined) {
    isActive = req.query.is_active.toString().toLowerCase() === "true";
  }

  // Call the database query with parameters
  const { result, error } = await secretQueries.list(ctx.secretsDbKey, {
    limit,
    offset,
    isActive,
  });

  // Handle expected errors (none defined for list operation)
  if (error) {
    throw error satisfies never;
  }

  // Map database entities to API response format
  const response: SecretsServiceResponseBody["listSecrets"][200] =
    result.map(mapSecretToResponse);

  res.status(200).json(response);
});
