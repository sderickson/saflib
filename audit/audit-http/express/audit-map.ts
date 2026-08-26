export type AuditOutcome = "success" | "denied" | "error";

export interface AuditMapEntry {
  eventType: string;
  resourceType: string;
  alsoEmitFor?: string[];
  outcomeOverride?: (statusCode: number) => AuditOutcome;
  /**
   * When set, handlers must `await appendFailClosedHttpAuditIfRequired(...)` after a
   * successful mutation and before sending a response whose status is listed in
   * {@link failClosedStatusCodes}. If audit append fails, the client gets **503** even
   * if the primary DB mutation already committed.
   */
  failClosed?: boolean;
  /**
   * HTTP status codes for which the fail-closed append runs. Defaults to **200, 201, 204**
   * when {@link failClosed} is true.
   */
  failClosedStatusCodes?: number[];
}
