import type {
  LoginFlow,
  RegistrationFlow,
  UpdateLoginFlowBody,
  UpdateRegistrationFlowBody,
} from "@ory/client";

export { isKratosInputNode, kratosEffectiveInputType } from "../common/kratosNodeUtils.ts";
export { kratosSubmitErrorMessage as registrationSubmitErrorMessage } from "../common/kratosErrorMessage.ts";

/** Resolve email from Kratos password-method registration FormData. */
export function traitsEmailFromFormData(fd: FormData): string {
  return (
    String(fd.get("traits.email") ?? "").trim() ||
    String(fd.get("email") ?? "").trim() ||
    String(fd.get("traits[email]") ?? "").trim()
  );
}

export function buildRegistrationPasswordBody(fd: FormData): UpdateRegistrationFlowBody {
  return {
    method: "password",
    csrf_token: String(fd.get("csrf_token") ?? ""),
    password: String(fd.get("password") ?? ""),
    traits: { email: traitsEmailFromFormData(fd) },
  };
}

/**
 * Builds a registration update body from the browser form, including password and passkey methods.
 */
export function buildRegistrationUpdateBodyFromFormData(fd: FormData): UpdateRegistrationFlowBody {
  let method = String(fd.get("method") ?? "").trim();
  if (!method) {
    if (String(fd.get("passkey_register") ?? "").trim()) {
      method = "passkey";
    } else {
      // Email-first step and password registration both use the password method.
      method = "password";
    }
  }
  if (method === "password") {
    return buildRegistrationPasswordBody(fd);
  }
  if (method === "passkey") {
    const traits: Record<string, unknown> = {};
    fd.forEach((value, key) => {
      if (key.startsWith("traits.")) {
        traits[key.slice("traits.".length)] = String(value).trim();
      }
    });
    return {
      method: "passkey",
      csrf_token: String(fd.get("csrf_token") ?? ""),
      passkey_register: String(fd.get("passkey_register") ?? ""),
      traits,
    };
  }
  throw new Error("Missing or unsupported registration method in form");
}

export function csrfTokenFromUiFlow(flow: LoginFlow | RegistrationFlow): string {
  for (const node of flow.ui.nodes) {
    if (node.type !== "input") continue;
    const attrs = node.attributes as { node_type?: string; name?: string; value?: string };
    if (attrs.node_type === "input" && attrs.name === "csrf_token") {
      return String(attrs.value ?? "");
    }
  }
  return "";
}

export function buildLoginPasswordBody(
  loginFlow: LoginFlow,
  email: string,
  password: string,
): UpdateLoginFlowBody {
  return {
    method: "password",
    csrf_token: csrfTokenFromUiFlow(loginFlow),
    identifier: email,
    password,
  };
}

/** Kratos echoes `return_to` from the browser registration request on the flow. */
export function postRegistrationNavigationUrl(flow: RegistrationFlow): string | undefined {
  const u = flow.return_to?.trim();
  return u || undefined;
}
