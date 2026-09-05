import type { UiNode } from "@ory/client";
import { isKratosInputNode } from "./kratosNodeUtils.ts";
import { invokeOryWebAuthnByTrigger } from "./oryWebAuthnWindow.ts";

/**
 * Runs Ory `webauthn.js` entrypoints for passkey/WebAuthn input nodes (`onclickTrigger`).
 * After the platform UI, Ory fills the form and calls `form.submit()` — intercepted in
 * {@link patchKratosFormSubmitForOryProgrammaticSubmit} so the SPA submits via the normal
 * `submit` handler instead of navigating.
 */
export function runKratosWebAuthnInputClick(node: UiNode): void {
  if (!isKratosInputNode(node)) return;
  const attrs = node.attributes;
  const trigger = attrs.onclickTrigger;
  if (!trigger || trigger === "11184809") return;
  invokeOryWebAuthnByTrigger(trigger);
}
