import type { UiNode } from "@ory/client";
import { isKratosInputNode } from "../common/kratosNodeUtils.ts";

/**
 * Preferred visual order for registration trait fields and password.
 * Kratos may send these in schema / JSON order; the UI normalizes for consistency.
 */
export const REGISTRATION_TRAIT_FIELD_ORDER = [
  "traits.name.first",
  "traits.name.last",
  "traits.email",
  "traits.phone",
  "password",
] as const;

/**
 * Returns a new array: same nodes as the flow, but any registration fields listed in
 * {@link REGISTRATION_TRAIT_FIELD_ORDER} appear in that order (when present). CSRF, scripts,
 * submit buttons, and other nodes keep their positions relative to the surrounding list, except
 * that the ordered fields are grouped and sorted starting at where the first such field appeared.
 */
export function sortRegistrationFlowNodes(nodes: readonly UiNode[]): UiNode[] {
  const order = REGISTRATION_TRAIT_FIELD_ORDER as readonly string[];
  const orderedNameSet = new Set<string>(order);

  const sequence: UiNode[] = [];
  const seen = new Set<UiNode>();
  for (const name of order) {
    for (const n of nodes) {
      if (seen.has(n)) continue;
      if (
        n.type === "input" &&
        isKratosInputNode(n) &&
        n.attributes.name === name
      ) {
        sequence.push(n);
        seen.add(n);
        break;
      }
    }
  }

  let placed = false;
  const out: UiNode[] = [];
  for (const n of nodes) {
    if (
      n.type === "input" &&
      isKratosInputNode(n) &&
      orderedNameSet.has(n.attributes.name)
    ) {
      if (!placed) {
        out.push(...sequence);
        placed = true;
      }
      continue;
    }
    out.push(n);
  }

  if (!placed && sequence.length > 0) {
    out.push(...sequence);
  }

  return out;
}
