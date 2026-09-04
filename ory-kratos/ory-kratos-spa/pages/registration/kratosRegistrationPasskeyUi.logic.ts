import type { RegistrationFlow, UiNode } from "@ory/client";

/**
 * Drops Kratos registration UI nodes in the `passkey` group (e.g. "Sign up with passkey").
 * Passkeys remain available after signup via settings.
 */
export function omitRegistrationPasskeySignupNodes(
  nodes: readonly UiNode[],
): UiNode[] {
  return nodes.filter((n) => (n.group ?? "default") !== "passkey");
}

/** Shallow clone only when nodes are removed so consumers keep referential stability. */
export function registrationFlowHidingPasskeySignup(
  flow: RegistrationFlow,
): RegistrationFlow {
  const nodes = omitRegistrationPasskeySignupNodes(flow.ui.nodes);
  if (nodes.length === flow.ui.nodes.length) return flow;
  return { ...flow, ui: { ...flow.ui, nodes } };
}
