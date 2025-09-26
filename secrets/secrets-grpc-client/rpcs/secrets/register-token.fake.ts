import {
  RegisterTokenRequest,
  RegisterTokenResponse,
  Success,
} from "@saflib/secrets-grpc-proto";

/**
 * Fake implementation of the RegisterToken RPC for testing.
 */
export const registerTokenFake = async (
  request: RegisterTokenRequest,
): Promise<RegisterTokenResponse> => {
  const { service_name, service_version, token } = request;

  // Simulate different responses based on the request
  if (!service_name || !service_version || !token) {
    return new RegisterTokenResponse({
      error: "INVALID_REQUEST",
    });
  }

  // Always return success for fake implementation
  return new RegisterTokenResponse({
    success: new Success(),
  });
};
