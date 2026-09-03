import { typedEnv } from "../env.ts";

/**
 * Whether the deployment is local development (`DEPLOYMENT_NAME=development`).
 */
export function isDevelopmentDeployment(
  deploymentName: string | undefined = typedEnv.DEPLOYMENT_NAME,
): boolean {
  return deploymentName === "development";
}
