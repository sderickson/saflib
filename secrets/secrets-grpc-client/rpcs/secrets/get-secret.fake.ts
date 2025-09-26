import {
  GetSecretRequest,
  GetSecretResponse,
  GetSecretError,
  GetSecretSuccess,
} from "@saflib/secrets-grpc-proto";

/**
 * Fake implementation of the GetSecret RPC for testing.
 */
export const getSecretFake = async (
  request: GetSecretRequest,
): Promise<GetSecretResponse> => {
  const { secret_name, token } = request;

  // Simulate different responses based on the request
  if (token === "invalid-token") {
    return new GetSecretResponse({
      error: GetSecretError.GET_SECRET_INVALID_TOKEN,
    });
  }

  if (token === "unapproved-token") {
    return new GetSecretResponse({
      error: GetSecretError.GET_SECRET_TOKEN_NOT_APPROVED,
    });
  }

  if (secret_name === "missing-secret") {
    return new GetSecretResponse({
      error: GetSecretError.GET_SECRET_NOT_FOUND,
    });
  }

  if (secret_name === "inactive-secret") {
    return new GetSecretResponse({
      error: GetSecretError.GET_SECRET_NOT_ACTIVE,
    });
  }

  // Return a fake secret value for valid requests
  return new GetSecretResponse({
    success: new GetSecretSuccess({
      value: `fake-secret-value-for-${secret_name}`,
    }),
  });
};
