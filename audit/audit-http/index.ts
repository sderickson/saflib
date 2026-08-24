export type { AuditMapEntry, AuditOutcome } from "./express/audit-map.ts";
export {
  createAuditRecorder,
  resolveRoutePattern,
  type AuditRecorder,
  type AuditRecorderOptions,
  type FailClosedHttpAuditOptions,
  type HttpAuditRecorderLocals,
} from "./express/audit-recorder.ts";
export { createAuditRouter, type CreateAuditRouterOptions } from "./express/createAuditRouter.ts";
