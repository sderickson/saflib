import type { Session } from "@ory/client";
import { isAxiosError } from "axios";
import { getKratosFrontendApi } from "../kratos-client.ts";

/** FrontendApi `toSession` (browser cookies). 401 resolves to `null` (not authenticated). */
export async function fetchKratosSession(): Promise<Session | null> {
  try {
    const res = await getKratosFrontendApi().toSession();
    return res.data;
  } catch (e) {
    if (isAxiosError(e) && e.response?.status === 401) {
      return null;
    }
    throw e;
  }
}
