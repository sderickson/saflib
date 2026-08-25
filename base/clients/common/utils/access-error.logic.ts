import { linkToHrefWithHost } from "@saflib/links";
import { accountLinks } from "@saflib/base-links";
import {
  TanstackError,
  AUTH_ERROR_EMAIL_VERIFICATION_REQUIRED,
  AUTH_ERROR_MFA_REQUIRED,
} from "@saflib/sdk";
import type { QueryClient } from "@tanstack/vue-query";
import {
  aal2LoginFlowHasMfaMethods,
  createLoginFlowQueryOptions,
  LoginFlowCreated,
  resolveMfaContinueHref,
} from "@saflib/ory-kratos-sdk";
import { authLinks, kratosAal2ParamValue } from "@saflib/ory-kratos-sdk/links";

export type BaseAccessErrorKind = "login" | "mfa" | "email" | "payment";

export type BaseMfaProbeResult =
  | { kind: "setup"; href: string }
  | { kind: "step_up"; href: string }
  | { kind: "error" };

function returnToParam(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const href = window.location.href;
  return href.trim() !== "" ? href : undefined;
}

export function isEmailVerificationRequiredError(error: unknown): boolean {
  return (
    error instanceof TanstackError &&
    error.status === 403 &&
    error.code === AUTH_ERROR_EMAIL_VERIFICATION_REQUIRED
  );
}

export function resolveBaseAccessErrorKind(
  error: unknown,
): BaseAccessErrorKind | null {
  if (!(error instanceof TanstackError)) {
    return null;
  }
  if (error.status === 401) {
    return "login";
  }
  if (error.status === 402) {
    return "payment";
  }
  if (error.status === 403 && error.code === AUTH_ERROR_MFA_REQUIRED) {
    return "mfa";
  }
  if (error.status === 403 && error.code === AUTH_ERROR_EMAIL_VERIFICATION_REQUIRED) {
    return "email";
  }
  return null;
}

export function baseVerifyEmailHref(
  returnTo?: string,
  options?: { required?: boolean },
): string {
  const rt = returnTo ?? returnToParam();
  const params: Record<string, string> = {};
  if (rt) {
    params.return_to = rt;
  }
  if (options?.required) {
    params.required = "1";
  }
  return Object.keys(params).length > 0
    ? linkToHrefWithHost(accountLinks.verifyEmail, { params })
    : linkToHrefWithHost(accountLinks.verifyEmail);
}

export function baseMfaSetupHref(returnTo?: string): string {
  const rt = returnTo ?? returnToParam();
  return rt
    ? linkToHrefWithHost(accountLinks.mfa, { params: { return_to: rt } })
    : linkToHrefWithHost(accountLinks.mfa);
}

/**
 * Probes Kratos AAL2 login flow to distinguish MFA setup vs session step-up.
 */
export async function probeBaseMfaRequirement(
  queryClient: QueryClient,
): Promise<BaseMfaProbeResult> {
  const rt = returnToParam();
  const setupHref = baseMfaSetupHref(rt);
  try {
    const result = await queryClient.fetchQuery({
      ...createLoginFlowQueryOptions({
        returnTo: rt,
        aal: kratosAal2ParamValue,
      }),
      staleTime: 0,
    });
    if (!(result instanceof LoginFlowCreated)) {
      return { kind: "error" };
    }
    if (!aal2LoginFlowHasMfaMethods(result.flow.ui?.nodes)) {
      return { kind: "setup", href: setupHref };
    }
    return {
      kind: "step_up",
      href: resolveMfaContinueHref(result.flow, setupHref),
    };
  } catch {
    return { kind: "error" };
  }
}

export function baseAccessErrorAction(
  error: unknown,
): { label: string; href: string } | null {
  const kind = resolveBaseAccessErrorKind(error);
  const rt = returnToParam();
  if (kind === "mfa") {
    return {
      label: "Sign in with second factor",
      href: rt
        ? linkToHrefWithHost(authLinks.newLogin, {
            params: { return_to: rt, aal: kratosAal2ParamValue },
          })
        : linkToHrefWithHost(authLinks.newLogin, {
            params: { aal: kratosAal2ParamValue },
          }),
    };
  }
  return null;
}
