import type { operations } from "./dist/openapi.d.ts";

export type { paths, components, operations } from "./dist/openapi.d.ts";
import {
  type ExtractResponseBody,
  type ExtractRequestBody,
  castJson,
} from "@saflib/openapi-specs";

export type AuthResponse = ExtractResponseBody<operations>;
export type AuthRequest = ExtractRequestBody<operations>;

import * as json from "./dist/openapi.json" with { type: "json" };
export const jsonSpec = castJson(json);
