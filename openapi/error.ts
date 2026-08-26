import { readFileSync } from "fs";
import path from "path";

/**
 * The raw error.yaml file contents from this package.
 * Specs should `$ref: "pkg:@saflib/openapi/schemas/error.yaml"` rather than
 * copying this file. TypeScript consumers import from `@saflib/openapi/schemas/Error`.
 */
export const errorSchema = readFileSync(
  path.join(import.meta.dirname, "./schemas/error.yaml"),
  "utf8",
);
