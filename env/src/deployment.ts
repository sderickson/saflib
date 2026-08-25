/**
 * Whether the deployment is local development (`DEPLOYMENT_NAME=development`).
 */
export function isDevelopmentDeployment(
  deploymentName: string | undefined = process.env.DEPLOYMENT_NAME,
): boolean {
  return deploymentName === "development";
}
