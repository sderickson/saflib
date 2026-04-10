import type {
  Session,
  SettingsFlow,
  UiNode,
  UpdateSettingsFlowBody,
} from "@ory/client";
import { isKratosInputNode } from "../common/kratosNodeUtils.ts";
import {
  normalizeKratosTraitPathFromFormKey,
  traitsRecordFromFormData,
} from "../common/kratosTraitsFromFormData.ts";

/**
 * Kratos flow-level message id: account recovered — user should set a new password (session may be
 * short-lived). See Kratos i18n ids (e.g. 1060001).
 */
export const KRATOS_SETTINGS_PASSWORD_RECOVERY_MESSAGE_ID = 1060001;

export function settingsFlowHasPasswordRecoveryMessage(
  flow: SettingsFlow,
): boolean {
  return (flow.ui.messages ?? []).some(
    (m) => Number(m.id) === KRATOS_SETTINGS_PASSWORD_RECOVERY_MESSAGE_ID,
  );
}

/** Settings flow query runs only when the user has a Kratos session (browser flow creation requires auth). */
export function settingsFlowShouldFetch(
  sessionIsPending: boolean,
  session: Session | null | undefined,
): boolean {
  if (sessionIsPending) return false;
  return session != null;
}

/**
 * Builds {@link FormData} for a Kratos settings submit (same submit-button omission issue as recovery).
 */
export function formDataFromsettingsForm(
  form: HTMLFormElement,
  submitter: HTMLElement | null | undefined,
): FormData {
  const btn =
    submitter instanceof HTMLButtonElement ||
    submitter instanceof HTMLInputElement
      ? submitter
      : undefined;
  const fd = new FormData(form, btn);
  if (!String(fd.get("method") ?? "").trim()) {
    const methodControl = form.querySelector<
      HTMLInputElement | HTMLButtonElement
    >(
      'button[type="submit"][name="method"], input[type="submit"][name="method"]',
    );
    if (methodControl?.name) {
      fd.set(methodControl.name, methodControl.value ?? "");
    }
  }
  return fd;
}

/**
 * Kratos can emit both `traits.name.first` and `traits.name\.first` for nested traits; the latter
 * carries values. Drop the duplicate unescaped nodes so the profile tab does not show two fields each.
 */
export function dedupeKratosProfileTraitNodes(nodes: readonly UiNode[]): UiNode[] {
  const traitInputs = nodes.filter(
    (node): node is UiNode & { attributes: { name: string } } =>
      isKratosInputNode(node) &&
      typeof node.attributes.name === "string" &&
      node.attributes.name.startsWith("traits."),
  );
  const byNorm = new Map<string, { raw: string }[]>();
  for (const node of traitInputs) {
    const raw = node.attributes.name;
    const path = normalizeKratosTraitPathFromFormKey(raw);
    if (path == null) continue;
    const list = byNorm.get(path) ?? [];
    list.push({ raw });
    byNorm.set(path, list);
  }
  const dropRaw = new Set<string>();
  for (const [, list] of byNorm) {
    if (list.length < 2) continue;
    const hasEscaped = list.some(({ raw }) => /\\./.test(raw));
    if (!hasEscaped) continue;
    for (const { raw } of list) {
      if (!/\\./.test(raw)) dropRaw.add(raw);
    }
  }
  return nodes.filter((node) => {
    if (!isKratosInputNode(node)) return true;
    const raw = node.attributes.name;
    return typeof raw !== "string" || !dropRaw.has(raw);
  });
}

/** Nodes for one settings group (e.g. profile / password), plus shared CSRF from `default`. */
export function settingsNodesForGroup(
  flow: SettingsFlow,
  group: "profile" | "password" | "totp" | "passkey",
): UiNode[] {
  const g = group;
  const filtered = flow.ui.nodes.filter((node) => {
    if (
      node.attributes &&
      "id" in node.attributes &&
      node.attributes.id === "totp_secret_key"
    )
      return false;
    if (node.group === g) return true;
    if (node.type === "script" && g === "passkey") {
      const ng = node.group ?? "default";
      // Kratos often sends webauthn.js as `group: webauthn` on settings (not default/passkey).
      return ng === "default" || ng === "passkey" || ng === "webauthn";
    }
    if (node.type === "input" && node.group === "default") {
      const attrs = node.attributes as { name?: string };
      return attrs.name === "csrf_token" || attrs.name === "method";
    }
    return false;
  });
  if (g === "profile") {
    return dedupeKratosProfileTraitNodes(filtered);
  }
  return filtered;
}

/**
 * Builds an update body from a Kratos settings form. Supports any enabled Kratos settings method.
 */
export function buildSettingsUpdateBodyFromFormData(
  fd: FormData,
): UpdateSettingsFlowBody {
  let method = String(fd.get("method") ?? "").trim();
  // Passkey remove is a lone `type: "submit"` input with `name: "passkey_remove"` and credential id in
  // `value` (group `passkey`); there is no separate `method` field in the POST body.
  if (!method) {
    if (
      String(fd.get("passkey_remove") ?? "").trim() ||
      String(fd.get("passkey_settings_register") ?? "").trim()
    ) {
      method = "passkey";
    }
  }
  // TOTP unlink uses submit `totp_unlink` only (no hidden `method`; profile/password use submit name=method).
  if (!method && String(fd.get("totp_unlink") ?? "").trim()) {
    method = "totp";
  }
  if (method === "profile") {
    return {
      method: "profile",
      csrf_token: String(fd.get("csrf_token") ?? ""),
      traits: traitsRecordFromFormData(fd),
    } as UpdateSettingsFlowBody;
  }
  if (!method) {
    throw new Error("Unsupported settings method in form");
  }
  const body: Record<string, string> = {};
  fd.forEach((value, key) => {
    body[key] = String(value);
  });
  return {
    ...body,
    method,
  } as UpdateSettingsFlowBody;
}
