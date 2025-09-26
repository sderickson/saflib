import {
  RegisterTokenResponse,
  RegisterTokenRequest,
  RegisterTokenError,
  RegisterTokenSuccess,
} from "@saflib/secrets-grpc-proto";
import { getSafReporters } from "@saflib/node";
import {
  ServiceTokenNotFoundError,
  serviceTokenQueries,
  ServiceTokenAlreadyExistsError,
} from "@saflib/secrets-db";
import { secretsServiceStorage } from "@saflib/secrets-service-common";
import { hashToken } from "./hash.ts";

export const handleRegisterToken = async (
  request: RegisterTokenRequest,
): Promise<RegisterTokenResponse> => {
  const { log } = getSafReporters();
  const { secretsDbKey } = secretsServiceStorage.getStore()!;

  const { service_name, service_version, token } = request;

  if (!service_name || !service_version || !token) {
    return new RegisterTokenResponse({
      error: RegisterTokenError.REGISTER_TOKEN_INVALID_REQUEST,
    });
  }

  log.info(`Registering service token for ${service_name}`);

  const tokenHash = hashToken(token);

  // same response for all cases
  const response = new RegisterTokenResponse({
    success: new RegisterTokenSuccess(),
  });

  const { result: serviceToken, error: serviceTokenError } =
    await serviceTokenQueries.getByHash(secretsDbKey, tokenHash);
  if (serviceTokenError) {
    switch (true) {
      case serviceTokenError instanceof ServiceTokenNotFoundError:
        // expected
        break;
      default:
        throw serviceTokenError satisfies never;
    }
  }

  if (serviceToken) {
    log.info(`This token already exists for ${serviceToken.serviceName}`);
    return response;
  }

  const { error: createError } = await serviceTokenQueries.create(
    secretsDbKey,
    {
      serviceName: service_name,
      serviceVersion: service_version,
      tokenHash,
    },
  );

  if (createError) {
    switch (true) {
      case createError instanceof ServiceTokenAlreadyExistsError:
        log.warn(`Unexpected error, race condition?`);
        return response;
      default:
        throw createError satisfies never;
    }
  }

  return response;
};
