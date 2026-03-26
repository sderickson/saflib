import { Configuration, FrontendApi } from "@ory/client";
import { getProtocol, getHost } from "@saflib/links";

let frontendApi: FrontendApi | undefined;

/** Shared Ory Frontend API client (axios + cookies for browser flows). */
export function getKratosFrontendApi(): FrontendApi {
  if (!frontendApi) {
    let protocol = "http";
    let host = "localhost:3000";
    if (typeof document !== "undefined") {
      protocol = getProtocol();
      host = getHost();
    }
    const baseUrl = `${protocol}//kratos.${host}`;
    frontendApi = new FrontendApi(
      new Configuration({
        basePath: baseUrl,
        baseOptions: {
          withCredentials: true,
        },
      }),
    );
  }
  return frontendApi;
}
