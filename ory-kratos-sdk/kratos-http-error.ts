import { TanstackError } from "@saflib/sdk";
import { isAxiosError } from "axios";

/** Kratos returns HTTP 410 when a self-service flow id expired or was completed. */
export function isKratosFlowGoneError(error: unknown): boolean {
  if (error instanceof TanstackError) return error.status === 410;
  return isAxiosError(error) && error.response?.status === 410;
}
