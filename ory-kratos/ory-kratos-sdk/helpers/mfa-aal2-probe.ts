import type { LoginFlow, UiNode } from "@ory/client";
import { linkToHrefWithHost } from "@saflib/links";
import { authLinks } from "../links.ts";

/**
 * True when an AAL2 login flow has at least one non-hidden interactive control
 * (second-factor field / button). Empty UI means the user has no MFA method yet.
 */
export function aal2LoginFlowHasMfaMethods(
  nodes: readonly UiNode[] | undefined,
): boolean {
  if (!nodes?.length) {
    return false;
  }
  for (const node of nodes) {
    if (node.type === "img") {
      return true;
    }
    if (node.type === "text") {
      const body = (node.attributes as { text?: { text?: string } }).text?.text
        ?.trim();
      if (body) {
        return true;
      }
      continue;
    }
    if (node.type !== "input") {
      continue;
    }
    const attrs = node.attributes as { node_type?: string; type?: string };
    if (attrs.node_type !== "input") {
      continue;
    }
    const rawType = (attrs.type ?? "text").toLowerCase();
    if (rawType === "hidden") {
      continue;
    }
    return true;
  }
  return false;
}

/**
 * After probing `createBrowserLoginFlow({ aal: "aal2" })`, pick the continue URL:
 * - methods present → resume that login flow (step-up)
 * - no methods → `setupHref` (MFA enrollment)
 */
export function resolveMfaContinueHref(
  flow: Pick<LoginFlow, "id" | "ui">,
  setupHref: string,
): string {
  if (aal2LoginFlowHasMfaMethods(flow.ui?.nodes)) {
    return linkToHrefWithHost(authLinks.login, {
      params: { flow: flow.id },
    });
  }
  return setupHref;
}

/** Session AAL already satisfies MFA (skip post-login AAL2 probe). */
export function sessionSatisfiesMfa(
  authenticatorAssuranceLevel: string | undefined | null,
): boolean {
  return (
    authenticatorAssuranceLevel === "aal2" ||
    authenticatorAssuranceLevel === "aal3"
  );
}
