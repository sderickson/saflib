import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const devSiteDockerPackageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

export function resolveDevSiteDockerfilePath(
  packageRoot = devSiteDockerPackageRoot,
): string {
  const dockerfile = path.join(packageRoot, "Dockerfile");
  if (!existsSync(dockerfile)) {
    throw new Error(`Missing ${dockerfile}. Run saf-docker generate first.`);
  }
  return dockerfile;
}
