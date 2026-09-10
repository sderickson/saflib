import type { UiNode } from "@ory/client";
import { filterOutMergedLoginTriggerButton } from "../common/kratosLoginPasskeyInIdentifier.ts";
import { isKratosInputNode } from "../common/kratosNodeUtils.ts";

/**
 * True when the login flow would render at least one non-hidden field, text block, image, or
 * submit/button (after the same passkey-merge filtering as {@link LoginFlowForm}).
 *
 * Used to detect AAL2 step-up flows where Kratos returned no second-factor methods (e.g. user has
 * no TOTP/WebAuthn configured yet).
 */
export function loginFlowHasVisibleInteractiveNodes(
  nodes: readonly UiNode[],
): boolean {
  const filtered = filterOutMergedLoginTriggerButton(true, [...nodes]);
  for (const node of filtered) {
    if (node.type === "text") {
      const body = (node.attributes as { text?: { text: string } }).text?.text
        ?.trim();
      if (body) return true;
      continue;
    }
    if (node.type === "img") return true;
    if (isKratosInputNode(node)) {
      const rawType = (node.attributes.type ?? "text").toLowerCase();
      if (rawType === "hidden") continue;
      return true;
    }
  }
  return false;
}
