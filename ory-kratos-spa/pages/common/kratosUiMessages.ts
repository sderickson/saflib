import type { UiNode, UiText } from "@ory/client";

/** Kratos validation copy for empty required fields (e.g. after advancing a multi-step UI). */
export function isKratosPropertyMissingMessage(msg: UiText): boolean {
  if (msg.type !== "error") return false;
  const t = (msg.text ?? "").trim();
  return /^Property .+ is missing\.?$/i.test(t);
}

export type KratosFlowUiMessageFilterContext = {
  kind: "flow" | "node";
  node?: UiNode;
  nodeIdx?: number;
};
