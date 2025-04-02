// import type { operations } from "./dist/openapi.d.ts";

// export type { paths, components, operations } from "./dist/openapi.d.ts";

// // Re-export the schema types for easier access
// export type ResponseSchema<
//   O extends keyof operations,
//   S extends keyof operations[O]["responses"],
// > = operations[O]["responses"][S] extends {
//   content: { "application/json": any };
// }
//   ? operations[O]["responses"][S]["content"]["application/json"]
//   : never;

// export type RequestSchema<O extends keyof operations> =
//   operations[O]["requestBody"] extends { content: { "application/json": any } }
//     ? operations[O]["requestBody"]["content"]["application/json"]
//     : never;

// import type { OpenAPIV3 } from "express-openapi-validator/dist/framework/types.ts";
// import * as json from "./dist/openapi.json" with { type: "json" };
// export const jsonSpec = (json as any).default as OpenAPIV3.DocumentV3;
