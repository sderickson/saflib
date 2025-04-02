import type { OpenAPIV3 } from "express-openapi-validator/dist/framework/types.ts";

export const castJson = (json: any) => {
  return json.default as OpenAPIV3.DocumentV3;
};

export type ExtractResponseSchema<Ops extends Record<string, any>> = {
  [OpKey in keyof Ops]: {
    [StatusCode in keyof Ops[OpKey]["responses"]]: Ops[OpKey]["responses"][StatusCode] extends {
      content: { "application/json": any };
    }
      ? Ops[OpKey]["responses"][StatusCode]["content"]["application/json"]
      : never;
  };
};

export type ExtractRequestSchema<Ops extends Record<string, any>> = {
  [OpKey in keyof Ops]: Ops[OpKey]["requestBody"] extends {
    content: { "application/json": any };
  }
    ? Ops[OpKey]["requestBody"]["content"]["application/json"]
    : never;
};
