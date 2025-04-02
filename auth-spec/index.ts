import type { operations } from "./dist/openapi.d.ts";

export type { paths, components, operations } from "./dist/openapi.d.ts";
import {
  type ExtractResponseSchema,
  type ExtractRequestSchema,
  castJson,
} from "@saflib/openapi-specs";

export type AuthResponse = ExtractResponseSchema<operations>;
export type AuthRequest = ExtractRequestSchema<operations>;

import * as json from "./dist/openapi.json" with { type: "json" };
export const jsonSpec = castJson(json);
