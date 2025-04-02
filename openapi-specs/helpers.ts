//
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
