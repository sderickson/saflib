import { createHandler } from "@saflib/express";
import type { SecretsServiceResponseBody } from "@saflib/secrets-spec";
import { secretsServiceStorage } from "@saflib/secrets-service-common";
import { accessRequest } from "@saflib/secrets-db";
import { mapAccessRequestToResponse } from "../_helpers.js";

export const listHandler = createHandler(async (req, res) => {
  const ctx = secretsServiceStorage.getStore()!;

  // Get query parameters for pagination and filtering
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
  const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
  const status = req.query.status as "pending" | "granted" | "denied" | undefined;
  const serviceName = req.query.service_name as string | undefined;

  // Call the database query with parameters
  const { result, error } = await accessRequest.list(ctx.secretsDbKey, {
    limit,
    offset,
    status,
    serviceName,
  });

  // Handle expected errors (none defined for list operation)
  if (error) {
    throw error satisfies never;
  }

  // Map database entities to API response format
  const response: SecretsServiceResponseBody["listAccessRequests"][200] =
    result.map(request => mapAccessRequestToResponse(request));

  res.status(200).json(response);
});
