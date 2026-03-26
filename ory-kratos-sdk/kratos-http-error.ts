import { TanstackError } from "@saflib/sdk";
import { isAxiosError } from "axios";

/** Kratos returns HTTP 410 when a self-service flow id expired or was completed. */
export function isKratosFlowGoneError(error: unknown): boolean {
  if (error instanceof TanstackError) return error.status === 410;
  return isAxiosError(error) && error.response?.status === 410;
}

/** Kratos can return 403 with redirect_browser_to when privileged/AAL re-auth is required. */
export function isKratosAalNotSatisfiedError(error: unknown): boolean {
  if (!isAxiosError(error)) return false;
  if (error.response?.status !== 403) return false;
  const d = error.response?.data;
  return Boolean(
    d &&
      typeof d === "object" &&
      "redirect_browser_to" in d &&
      typeof (d as { redirect_browser_to?: unknown }).redirect_browser_to === "string",
  );
}

export function kratosAalNotSatisfiedRedirectTo(error: unknown): string | undefined {
  if (!isKratosAalNotSatisfiedError(error)) return undefined;
  const d = (error as { response?: { data?: { redirect_browser_to?: string } } }).response?.data;
  return d?.redirect_browser_to;
}
