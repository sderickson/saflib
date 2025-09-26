import {
  GetSecretRequest,
  GetSecretResponse,
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
      value: "",
      success: false,
      error_message: "Invalid service token",
    });
  }

  if (token === "unapproved-token") {
    return new GetSecretResponse({
      value: "",
      success: false,
      error_message: "Service token not approved",
    });
  }

  if (secret_name === "missing-secret") {
    return new GetSecretResponse({
      value: "",
      success: false,
      error_message:
        "Secret 'missing-secret' not found. Access request created for approval.",
    });
  }

  if (secret_name === "inactive-secret") {
    return new GetSecretResponse({
      value: "",
      success: false,
      error_message: "Secret is not active",
    });
  }

  // Return a fake secret value for valid requests
  return new GetSecretResponse({
    value: `fake-secret-value-for-${secret_name}`,
    success: true,
    error_message: "",
  });
};
