import type { UiNode } from "@ory/client";
import { isKratosInputNode } from "./kratosNodeUtils.ts";

/**
 * Kratos stores passkey `display_name` from AAGUID metadata when known; otherwise the credential has
 * no name and the API labels removals as "unnamed". Use the signed-in identity email as a readable
 * fallback for the button text.
 */
export function kratosPasskeyRemoveButtonLabel(
  node: UiNode,
  allNodes: readonly UiNode[],
  identityEmailFallback: string | undefined,
): string | null {
  if (!isKratosInputNode(node)) return null;
  if (node.attributes.name !== "passkey_remove") return null;

  const ctx = node.meta?.label?.context as
    | { display_name?: string; added_at?: string }
    | undefined;
  const text = node.meta?.label?.text ?? "";
  const isUnnamed =
    ctx?.display_name === "unnamed" ||
    text.includes('"unnamed"') ||
    text.toLowerCase().includes("unnamed");
  if (!isUnnamed) return null;

  const email = identityEmailFallback?.trim();
  if (!email) return null;

  const removeNodes = allNodes.filter(
    (n) => isKratosInputNode(n) && n.attributes.name === "passkey_remove",
  );
  if (removeNodes.length <= 1) {
    return `Remove passkey (${email})`;
  }

  const added = ctx?.added_at;
  if (added) {
    try {
      const d = new Date(added);
      const short = d.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
      return `Remove passkey (${email} · ${short})`;
    } catch {
      /* ignore */
    }
  }
  return `Remove passkey (${email})`;
}
