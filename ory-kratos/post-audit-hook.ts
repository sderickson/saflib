import type { Handler } from "express";
import type { AuditCallbacks, KratosAuditEvent } from "./callbacks.ts";

/**
 * Invokes `onAuditEvent` and returns 204 on success. Errors are **not** caught
 * here — callers that need to avoid Kratos retries on persistent failures should
 * swallow errors inside `onAuditEvent` (see daemon `makeAuditCallbacks`).
 */
export const makePostAuditHookHandler =
  (callbacks: AuditCallbacks): Handler =>
  async (req, res) => {
    const body = (req.body ?? {}) as Partial<KratosAuditEvent>;
    if (typeof body.stage !== "string" || typeof body.identity_id !== "string") {
      res.status(400).json({ error: "missing stage or identity_id" });
      return;
    }
    await callbacks.onAuditEvent({
      stage: body.stage,
      flow_id: typeof body.flow_id === "string" ? body.flow_id : "",
      identity_id: body.identity_id,
      success: Boolean(body.success),
      methods: Array.isArray(body.methods)
        ? (body.methods as string[])
        : undefined,
      error_reason:
        typeof body.error_reason === "string" ? body.error_reason : undefined,
      user_agent: req.get("user-agent") ?? undefined,
      accept_language: req.get("accept-language") ?? undefined,
    });
    res.status(204).end();
  };
