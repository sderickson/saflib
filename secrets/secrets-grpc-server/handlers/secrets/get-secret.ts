import {
  GetSecretResponse,
  GetSecretError,
  GetSecretRequest,
  GetSecretSuccess,
} from "@saflib/secrets-grpc-proto";
import { getSafContext, getSafReporters } from "@saflib/node";
import {
  SecretNotFoundError,
  secretQueries,
  serviceTokenQueries,
  ServiceTokenNotFoundError,
  accessRequestQueries,
  AccessRequestNotFoundError,
  AccessRequestAlreadyExistsError,
} from "@saflib/secrets-db";
import {
  secretsServiceStorage,
  decryptSecret,
  upsertSecretEncryptionKey,
} from "@saflib/secrets-service-common";
import crypto from "crypto";

const hashToken = (token: string) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

export const handleGetSecret = async (
  request: GetSecretRequest,
): Promise<GetSecretResponse> => {
  const { log } = getSafReporters();
  const { subsystemName, operationName } = getSafContext();
  const { secretsDbKey } = secretsServiceStorage.getStore()!;
  log.info(`Call to ${subsystemName} - ${operationName}`);

  const { secret_name, token } = request;

  if (!secret_name || !token) {
    return new GetSecretResponse({
      error: GetSecretError.GET_SECRET_INVALID_REQUEST,
    });
  }

  // Check token first
  const { result: tokenResult, error: tokenError } =
    await serviceTokenQueries.getByHash(secretsDbKey, hashToken(token));
  if (tokenError) {
    switch (true) {
      case tokenError instanceof ServiceTokenNotFoundError:
        return new GetSecretResponse({
          error: GetSecretError.GET_SECRET_INVALID_TOKEN,
        });
      default:
        throw tokenError satisfies never;
    }
  }

  if (!tokenResult.approved) {
    return new GetSecretResponse({
      error: GetSecretError.GET_SECRET_TOKEN_NOT_APPROVED,
    });
  }

  const { result: accessRequest, error: accessRequestError } =
    await accessRequestQueries.lookup(secretsDbKey, {
      serviceName: tokenResult.serviceName,
      secretName: secret_name,
    });
  if (accessRequestError) {
    switch (true) {
      case accessRequestError instanceof AccessRequestNotFoundError:
        const { error: createError } = await accessRequestQueries.create(
          secretsDbKey,
          {
            serviceName: tokenResult.serviceName,
            secretName: secret_name,
          },
        );
        if (createError) {
          switch (true) {
            case createError instanceof AccessRequestAlreadyExistsError:
              return new GetSecretResponse({
                error: GetSecretError.GET_SECRET_UNKNOWN_ERROR,
              });
            default:
              throw createError satisfies never;
          }
        }
        return new GetSecretResponse({
          error: GetSecretError.GET_SECRET_ACCESS_NOT_GRANTED,
        });
      default:
        throw accessRequestError satisfies never;
    }
  }

  if (accessRequest.status !== "granted") {
    return new GetSecretResponse({
      error: GetSecretError.GET_SECRET_ACCESS_NOT_GRANTED,
    });
  }

  // Get secret from database
  const { result: secret, error: getError } = await secretQueries.getByName(
    secretsDbKey,
    secret_name,
  );
  if (getError) {
    switch (true) {
      case getError instanceof SecretNotFoundError:
        return new GetSecretResponse({
          error: GetSecretError.GET_SECRET_NOT_FOUND,
        });
      default:
        throw getError satisfies never;
    }
  }
  if (!secret.isActive) {
    return new GetSecretResponse({
      error: GetSecretError.GET_SECRET_NOT_ACTIVE,
    });
  }

  if (!secret.valueEncrypted) {
    return new GetSecretResponse({
      error: GetSecretError.GET_SECRET_UNKNOWN_ERROR,
    });
  }

  const encryptionKey = upsertSecretEncryptionKey();
  const decryptedValue = decryptSecret(encryptionKey, secret.valueEncrypted);

  return new GetSecretResponse({
    success: new GetSecretSuccess({
      value: decryptedValue,
    }),
  });
};
