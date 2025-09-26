import {
  RegisterTokenRequest,
  RegisterTokenResponse,
} from "@saflib/secrets-grpc-proto";

/**
 * Fake implementation of the RegisterToken RPC for testing.
 */
export const registerTokenFake = async (
  _request: RegisterTokenRequest,
): Promise<RegisterTokenResponse> => {
  // TODO: Implement fake response based on the request
  return new RegisterTokenResponse({
    // TODO: Add response fields as needed
  });
};
