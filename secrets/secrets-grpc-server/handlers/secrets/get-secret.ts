import {
  GetSecretResponse,
  GetSecretRequest,
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

  // Check token first
  const { result: tokenResult, error: tokenError } =
    await serviceTokenQueries.getByHash(secretsDbKey, hashToken(token));
  if (tokenError) {
    switch (true) {
      case tokenError instanceof ServiceTokenNotFoundError:
        return new GetSecretResponse({
          value: "",
          success: false,
          error_message: "Invalid service token",
        });
      default:
        throw tokenError satisfies never;
    }
  }

  if (!tokenResult.approved) {
    return new GetSecretResponse({
      value: "",
      success: false,
      error_message: "Service token not approved",
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
          value: "",
          success: false,
          error_message: `Secret '${secret_name}' not found. Access request created for approval.`,
        });
      default:
        throw getError satisfies never;
    }
  }
  if (!secret.isActive) {
    return new GetSecretResponse({
      value: "",
      success: false,
      error_message: "Secret is not active",
    });
  }

  const { result: accessRequest, error: accessRequestError } =
    await accessRequestQueries.lookup(secretsDbKey, {
      serviceName: tokenResult.serviceName,
      secretId: secret.id,
    });
  if (accessRequestError) {
    switch (true) {
      case accessRequestError instanceof AccessRequestNotFoundError:
        const { error: createError } = await accessRequestQueries.create(
          secretsDbKey,
          {
            serviceName: tokenResult.serviceName,
            secretId: secret.id,
          },
        );
        if (createError) {
          switch (true) {
            case createError instanceof AccessRequestAlreadyExistsError:
              return new GetSecretResponse({
                value: "",
                success: false,
                error_message: "Access request already exists",
              });
            default:
              throw createError satisfies never;
          }
        }
        return new GetSecretResponse({
          value: "",
          success: false,
          error_message: "Access request created for approval",
        });
      default:
        throw accessRequestError satisfies never;
    }
  }

  if (accessRequest.status !== "granted") {
    return new GetSecretResponse({
      value: "",
      success: false,
      error_message: "Access request not granted. Awaiting approval.",
    });
  }

  if (!secret.valueEncrypted) {
    return new GetSecretResponse({
      value: "",
      success: false,
      error_message: "Secret value not set yet.",
    });
  }

  const encryptionKey = upsertSecretEncryptionKey();
  const decryptedValue = decryptSecret(encryptionKey, secret.valueEncrypted);

  return new GetSecretResponse({
    value: decryptedValue,
    success: true,
    error_message: "",
  });
};
