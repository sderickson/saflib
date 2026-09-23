import { TanstackError } from "@saflib/sdk";
import { AUTH_ERROR_MFA_REQUIRED } from "@saflib/utils/auth-error-codes";

export type AsyncPageErrorAction = {
  label: string;
  href: string;
};

export type AsyncPageErrorDescription = {
  message: string;
  action?: AsyncPageErrorAction;
};

/**
 * User-facing copy for the default async page error alert.
 * `MFA_REQUIRED` gets its own message and, when the app configured a URL, a link.
 */
export function describeAsyncPageError(
  error: unknown,
  options?: { message?: string; mfaRequiredHref?: string },
): AsyncPageErrorDescription {
  if (options?.message) {
    return { message: options.message };
  }
  if (!error) {
    return { message: "An unexpected error occurred." };
  }
  if (!(error instanceof TanstackError)) {
    return { message: "An unexpected error occurred." };
  }
  if (error.code === AUTH_ERROR_MFA_REQUIRED) {
    const href = options?.mfaRequiredHref;
    return {
      message: "Multi-factor authentication is required.",
      ...(href
        ? { action: { label: "Set up MFA", href } }
        : {}),
    };
  }
  switch (error.status) {
    case 401:
      return { message: "Not Logged In" };
    case 402:
      return { message: "Payment Required" };
    case 403:
      return { message: "Forbidden" };
    case 404:
      return { message: "Not Found" };
    case 500:
      return { message: "Server Error" };
    case 0:
      return { message: "Connection Error" };
    default:
      return { message: `Failed to load data (Error ${error.status})` };
  }
}
