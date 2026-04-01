import { getTanstackErrorMessage, TanstackError } from "@saflib/sdk";
import { isAxiosError } from "axios";

export function kratosSubmitErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof TanstackError) {
    return getTanstackErrorMessage(error);
  }
  if (isAxiosError(error)) {
    const d = error.response?.data;
    if (d !== undefined && typeof d !== "object") {
      return String(d);
    }
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}
