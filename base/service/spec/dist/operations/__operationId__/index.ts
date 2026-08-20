/**
 * Scaffold placeholder until openapi/route + saf-specs generate produce a real
 * operation fragment. express/add-handler remaps __operationId__ on copy.
 */
export const operationJsonSpec = {
  openapi: "3.0.0",
  info: { title: "__operationId__", version: "0.0.0" },
  paths: {},
} as const;

export type RequestBody = unknown;
export type ResponseBody = unknown;
export type PathParams = Record<string, never>;
export type QueryParams = Record<string, never>;

export const operationId = "__operationId__" as const;
