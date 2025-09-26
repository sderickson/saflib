import { createHandler } from "@saflib/express";
import type {
  SecretsServiceRequestBody,
  SecretsServiceResponseBody,
} from "@saflib/secrets-spec";
import createError from "http-errors";
import { secretsServiceStorage } from "@saflib/secrets-service-common";
import {
  secretQueries,
  SecretNotFoundError,
  SecretAlreadyExistsError,
} from "@saflib/secrets-db";
import { mapSecretToResponse } from "../_helpers.js";
import {
  upsertSecretEncryptionKey,
  encryptSecret,
} from "@saflib/secrets-service-common";

export const updateHandler = createHandler(async (req, res) => {
  const ctx = secretsServiceStorage.getStore()!;
  const data: SecretsServiceRequestBody["updateSecret"] = req.body;
  const secretId = req.params.id;

  // Prepare update parameters
  const updateParams: any = {
    id: secretId,
  };

  // Only update provided fields
  if (data.description !== undefined) {
    updateParams.description = data.description;
  }

  if (data.is_active !== undefined) {
    updateParams.isActive = data.is_active;
  }

  // If value is being updated, encrypt it
  if (data.value !== undefined) {
    const encryptionKey = upsertSecretEncryptionKey();
    const encryptedValue = encryptSecret(encryptionKey, data.value);
    updateParams.valueEncrypted = encryptedValue;
  }

  // Call the database to update the secret
  const { result, error } = await secretQueries.update(
    ctx.secretsDbKey,
    updateParams,
  );

  // Handle expected errors
  if (error) {
    switch (true) {
      case error instanceof SecretNotFoundError:
        throw createError(404, `Secret with id '${secretId}' not found`);
      case error instanceof SecretAlreadyExistsError:
        // This happens if trying to update name to an existing name
        throw createError(409, error.message);
      default:
        throw error satisfies never;
    }
  }

  // Map result to API response
  const response: SecretsServiceResponseBody["updateSecret"][200] =
    mapSecretToResponse(result);

  res.status(200).json(response);
});
