import type { operations } from "./dist/openapi.d.ts";

export type { paths, components, operations } from "./dist/openapi.d.ts";

/**
 * Generic helper type to extract response schema from any operations type
 * @template Ops - The operations type (e.g. from OpenAPI spec)
 */
export type ExtractResponseSchema<Ops extends Record<string, any>> = {
  [OpKey in keyof Ops]: {
    [StatusCode in keyof Ops[OpKey]["responses"]]: Ops[OpKey]["responses"][StatusCode] extends {
      content: { "application/json": any };
    }
      ? Ops[OpKey]["responses"][StatusCode]["content"]["application/json"]
      : never;
  };
};

/**
 * Generic helper type to extract request schema from any operations type
 * @template Ops - The operations type (e.g. from OpenAPI spec)
 */
export type ExtractRequestSchema<Ops extends Record<string, any>> = {
  [OpKey in keyof Ops]: Ops[OpKey]["requestBody"] extends {
    content: { "application/json": any };
  }
    ? Ops[OpKey]["requestBody"]["content"]["application/json"]
    : never;
};

// For backward compatibility, keep the original types
export type ResponseSchema<
  O extends keyof operations,
  S extends keyof operations[O]["responses"],
> = ExtractResponseSchema<operations>[O][S];

export type RequestSchema<O extends keyof operations> =
  ExtractRequestSchema<operations>[O];

import type { OpenAPIV3 } from "express-openapi-validator/dist/framework/types.ts";
import * as json from "./dist/openapi.json" with { type: "json" };
export const jsonSpec = (json as any).default as OpenAPIV3.DocumentV3;
