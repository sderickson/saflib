import type { UiNode } from "@ory/client";
import { isKratosInputNode } from "./kratosNodeUtils.ts";

/** Passkey login trigger (browser flow). */
export function isPasskeyLoginTriggerButton(node: UiNode): boolean {
  if (!isKratosInputNode(node)) return false;
  return (
    node.group === "passkey" &&
    node.attributes.type === "button" &&
    node.attributes.name === "passkey_login_trigger"
  );
}

/** WebAuthn login trigger (non-passkey WebAuthn), same combined-field UX. */
export function isWebAuthnLoginTriggerButton(node: UiNode): boolean {
  if (!isKratosInputNode(node)) return false;
  return (
    node.group === "webauthn" &&
    node.attributes.type === "button" &&
    node.attributes.name === "webauthn_login_trigger"
  );
}

export function findPasskeyOrWebAuthnLoginTrigger(nodes: readonly UiNode[]): UiNode | null {
  for (const n of nodes) {
    if (isPasskeyLoginTriggerButton(n) || isWebAuthnLoginTriggerButton(n)) return n;
  }
  return null;
}

function hasIdentifierTextField(nodes: readonly UiNode[]): boolean {
  return nodes.some((n) => {
    if (!isKratosInputNode(n)) return false;
    if (n.attributes.name !== "identifier") return false;
    const t = n.attributes.type;
    return t !== "hidden" && t !== "submit" && t !== "button";
  });
}

/**
 * When true, the login trigger button can be merged into the identifier field as an icon (see
 * {@link filterOutMergedLoginTriggerButton}).
 */
export function shouldMergePasskeyTriggerIntoIdentifier(
  enabled: boolean,
  nodes: readonly UiNode[],
): boolean {
  if (!enabled) return false;
  return hasIdentifierTextField(nodes) && findPasskeyOrWebAuthnLoginTrigger(nodes) != null;
}

/** Omits the standalone passkey/WebAuthn login button; the trigger is invoked from the identifier field. */
export function filterOutMergedLoginTriggerButton(
  enabled: boolean,
  nodes: readonly UiNode[],
): UiNode[] {
  if (!shouldMergePasskeyTriggerIntoIdentifier(enabled, nodes)) return [...nodes];
  return nodes.filter(
    (n) => !(isPasskeyLoginTriggerButton(n) || isWebAuthnLoginTriggerButton(n)),
  );
}
