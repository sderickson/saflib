import type { Session, UpdateVerificationFlowBody, VerificationFlow } from "@ory/client";
import { VerificationFlowState } from "@ory/client";

/** Whether the verification flow query should run: only when `?flow=` is present (email link or after "Send a code"). */
export function verificationFlowShouldFetch(flowIdFromRoute: string | undefined): boolean {
  return typeof flowIdFromRoute === "string" && flowIdFromRoute.trim() !== "";
}

/** Kratos marks a completed verification with {@link VerificationFlowState.PassedChallenge}. */
export function verificationFlowIsComplete(flow: VerificationFlow): boolean {
  return flow.state === VerificationFlowState.PassedChallenge;
}

/** Where to send the browser after successful verification: Kratos `return_to` or the injected hub app fallback URL. */
export function destinationAfterVerification(
  flowReturnTo: string | null | undefined,
  fallbackRecipesHomeHref: string,
): string {
  const u = flowReturnTo?.trim();
  return u || fallbackRecipesHomeHref;
}

/**
 * Builds the verification `code` strategy body from the browser form.
 * Kratos: send `email` without `code` to request/send a code; send `code` without `email` to verify it.
 */
export function buildVerificationUpdateBodyFromFormData(
  fd: FormData,
): UpdateVerificationFlowBody {
  const csrf_token = String(fd.get("csrf_token") ?? "");
  const code = String(fd.get("code") ?? "").trim();
  const email = String(fd.get("email") ?? "").trim();

  if (code) {
    return { method: "code", csrf_token, code };
  }
  if (email) {
    return { method: "code", csrf_token, email };
  }
  return { method: "code", csrf_token };
}

export function csrfTokenFromVerificationFlow(flow: VerificationFlow): string {
  for (const node of flow.ui.nodes) {
    if (node.type !== "input") continue;
    const attrs = node.attributes as { node_type?: string; name?: string; value?: string };
    if (attrs.node_type === "input" && attrs.name === "csrf_token") {
      return String(attrs.value ?? "");
    }
  }
  return "";
}

/**
 * Email used to request a new verification code (Kratos: `email` on code method invalidates the
 * previous code and re-sends). Prefer session traits; fall back to email-like nodes from the flow.
 */
export function emailForVerificationResend(
  session: Session | null | undefined,
  flow: VerificationFlow | null | undefined,
): string | undefined {
  const traits = session?.identity?.traits as { email?: string } | undefined;
  if (traits?.email?.trim()) return traits.email.trim();
  if (!flow) return undefined;
  for (const node of flow.ui.nodes) {
    if (node.type !== "input") continue;
    const attrs = node.attributes as { name?: string; value?: string };
    const name = attrs.name ?? "";
    if (name === "email" || name === "traits.email" || name.endsWith("email")) {
      const v = attrs.value;
      if (v) return String(v).trim();
    }
  }
  return undefined;
}

/** Resend payload: `method: code` with `email` and no `code` (per Ory Kratos verification API). */
export function buildVerificationResendCodeBody(
  flow: VerificationFlow,
  email: string,
): UpdateVerificationFlowBody {
  return {
    method: "code",
    csrf_token: csrfTokenFromVerificationFlow(flow),
    email: email.trim(),
  };
}
