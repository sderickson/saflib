import type { UiNode } from "@ory/client";

export function isKratosInputNode(
  node: UiNode,
): node is UiNode & { attributes: Extract<UiNode["attributes"], { node_type: "input" }> } {
  return (
    node.type === "input" &&
    (node.attributes as { node_type?: string }).node_type === "input"
  );
}

/** `traits.phone` — custom UI uses US phone input and submits E.164. */
export function isKratosTraitsPhoneInputNode(node: UiNode): boolean {
  return isKratosInputNode(node) && node.attributes.name === "traits.phone";
}

export type KratosInputAttrs = { name: string; type: string };

/** Kratos may send password fields as `type="text"`; normalize so the field is masked. */
export function kratosEffectiveInputType(attrs: KratosInputAttrs): string {
  const raw = (attrs.type ?? "text").toLowerCase();
  if (raw === "hidden" || raw === "submit") return raw;
  if (raw === "password") return "password";
  const n = (attrs.name ?? "").toLowerCase();
  if (n === "password" || n.endsWith(".password") || n.endsWith("[password]")) {
    return "password";
  }
  return raw;
}
