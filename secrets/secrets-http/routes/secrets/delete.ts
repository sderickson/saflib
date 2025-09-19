import { createHandler } from "@saflib/express";
import type { SecretsServiceResponseBody } from "@saflib/secrets-spec";
import createError from "http-errors";
import { secretsServiceStorage } from "@saflib/secrets-service-common";
import {
  secrets,
  SecretNotFoundError,
  SecretAlreadyExistsError,
} from "@saflib/secrets-db";

export const deleteHandler = createHandler(async (req, res) => {
  const ctx = secretsServiceStorage.getStore()!;
  const secretId = req.params.id;

  // Perform soft delete by setting is_active to false
  const { error } = await secrets.update(ctx.secretsDbKey, {
    id: secretId,
    isActive: false,
  });

  // Handle expected errors
  if (error) {
    switch (true) {
      case error instanceof SecretNotFoundError:
        throw createError(404, `Secret with id '${secretId}' not found`);
      case error instanceof SecretAlreadyExistsError:
        // This shouldn't happen for delete operations, but handle it just in case
        throw createError(409, error.message);
      default:
        throw error satisfies never;
    }
  }

  // Return success message - check what the spec expects for delete response
  const response: SecretsServiceResponseBody["deleteSecret"][200] = {
    message: "Secret deleted successfully",
  };

  res.status(200).json(response);
});
