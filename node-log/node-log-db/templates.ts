import { createHash } from "node:crypto";

export { normalizeTemplate } from "@saflib/utils/telemetry-template";

/** Stable short id for a template within a service. */
export function templateHash(serviceName: string | null, template: string): string {
  return createHash("sha256")
    .update(`${serviceName ?? ""}\u0000${template}`)
    .digest("hex")
    .slice(0, 16);
}
