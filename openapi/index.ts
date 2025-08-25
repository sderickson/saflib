import { readFileSync } from "fs";
import path from "path";

export const errorSchema = readFileSync(
  path.join(import.meta.dirname, "./schemas/error.yaml"),
  "utf8",
);

export * from "./helpers.ts";
