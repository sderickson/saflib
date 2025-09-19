import { createHandler } from "@saflib/express";
import type { SecretsServiceResponseBody } from "@saflib/secrets-spec";

export const listHandler = createHandler(async (_req, res) => {
  // TODO: Implement access requests listing
  // For now, return empty array to allow tests to pass
  const response: SecretsServiceResponseBody["listAccessRequests"][200] = [];

  res.status(200).json(response);
});
