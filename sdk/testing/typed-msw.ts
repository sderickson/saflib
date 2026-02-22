import { getHost } from "@saflib/links";
import { http, HttpResponse } from "msw";

type ExtractRequestParams<Op extends Record<string, any>> =
  Op["parameters"] extends {
    path: { [key: string]: any };
  }
    ? Op["parameters"]["path"]
    : never;

export type ExtractRequestQuery<Op extends Record<string, any>> = Partial<
  Record<keyof NonNullable<Op["parameters"]["query"]>, string>
>;

type ExtractResponseBody<
  Op extends Record<string, any>,
  StatusCode extends number,
> = Op["responses"][StatusCode] extends {
  content: { "application/json": any };
}
  ? Op["responses"][StatusCode]["content"]["application/json"]
  : never;

type ExtractRequestBody<Op extends Record<string, any>> =
  Op["requestBody"] extends {
    content: { "application/json": any };
  }
    ? Op["requestBody"]["content"]["application/json"]
    : Op["requestBody"] extends {
          content: { "multipart/form-data": any };
        }
      ? Op["requestBody"]["content"]["multipart/form-data"]
      : never;

/**
 * Use to create a typed helper function for creating typesafe mock API handlers.
 */
export const typedCreateHandler = <Paths extends Record<string, any>>({
  subdomain,
}: {
  subdomain: string;
}) => {
  const createHandler = <
    P extends keyof Paths,
    V extends keyof Paths[P],
    S extends number,
  >({
    path,
    verb,
    status,
    handler,
  }: {
    path: P;
    verb: V;
    status: S;
    handler: (request: {
      query: ExtractRequestQuery<
        Paths[P][V] extends Record<string, any> ? Paths[P][V] : never
      >;
      params: ExtractRequestParams<
        Paths[P][V] extends Record<string, any> ? Paths[P][V] : never
      >;
      body: ExtractRequestBody<
        Paths[P][V] extends Record<string, any> ? Paths[P][V] : never
      >;
    }) => Promise<
      | ExtractResponseBody<
          Paths[P][V] extends Record<string, any> ? Paths[P][V] : never,
          S
        >
      | undefined
    >;
  }) => {
    type query = ExtractRequestQuery<
      Paths[P][V] extends Record<string, any> ? Paths[P][V] : never
    >;
    let domain = "localhost:3000";
    if (typeof document !== "undefined") {
      domain = getHost();
    }
    // translate instances of "{id}" (the openapi spec format) with ":id" (the msw format)
    const pathString = String(path).replace(/{(\w+)}/g, ":$1");
    let v = verb as keyof typeof http;
    if (verb === "__method__") {
      v = "post";
    }
    if (!http[v]) {
      throw new Error(`Invalid HTTP verb: ${v}`);
    }
    return http[v](
      `http://${subdomain}.${domain}${pathString}`,
      async (request) => {
        let body: any;
        if (verb === "post" || verb === "put" || verb === "patch") {
          try {
            const contentType =
              request.request.headers.get("content-type") || "";
            if (contentType.startsWith("multipart/form-data")) {
              // if you try to run json(), it doesn't crash... it just hangs. So don't parse it. Trying to call formData() also hangs.
              body = undefined;
            } else {
              body = await request.request.json();
            }
          } catch (e) {
            body = undefined;
          }
        }
        const query = request.request.url.split("?")[1];
        let queryParams: query = {};
        if (query) {
          queryParams = Object.fromEntries(
            new URLSearchParams(query).entries(),
          ) as query;
        }
        const params = { ...request.params };
        return HttpResponse.json(
          await handler({
            query: queryParams,
            params,
            body,
          }),
          { status },
        );
      },
    );
  };
  return { createHandler };
};
