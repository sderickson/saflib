import { Configuration, FrontendApi } from "@ory/client";
import { getBaseUrl } from "@saflib/sdk";

let frontendApi: FrontendApi | undefined;

/** Shared Ory Frontend API client (axios + cookies for browser flows). */
export function getKratosFrontendApi(): FrontendApi {
  if (!frontendApi) {
    const baseUrl = getBaseUrl("kratos");
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
