import {
  RegisterTokenResponse,
  RegisterTokenRequest,
} from "@saflib/secrets-grpc-proto";
import { getSafContext, getSafReporters } from "@saflib/node";
import { createServiceToken } from "@saflib/secrets-db";

export const handleRegisterToken = async (
  request: RegisterTokenRequest,
): Promise<RegisterTokenResponse> => {
  const { log } = getSafReporters();
  const { subsystemName, operationName } = getSafContext();
  log.info(`Call to ${subsystemName} - ${operationName}`);

  const { service_name, service_version, token } = request;

  try {
    // Create service token record in database
    const serviceToken = await createServiceToken({
      serviceName: service_name,
      serviceVersion: service_version,
      tokenHash: token, // This should be hashed before storing
      requestedAt: new Date(),
      approved: false, // Requires admin approval
    });

    log.info(`Service token registered for ${service_name}, awaiting approval`);

    return new RegisterTokenResponse({
      status: "pending_approval",
      message: `Service token registered for ${service_name}. Awaiting admin approval.`,
    });
  } catch (error) {
    log.error(`Failed to register service token for ${service_name}:`, error);

    return new RegisterTokenResponse({
      status: "denied",
      message: `Failed to register service token: ${error instanceof Error ? error.message : "Unknown error"}`,
    });
  }
};
