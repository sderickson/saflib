import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { StepFn } from "../types.ts";

export interface TransformFileStepInput {
  filePath: string;
  transform: (content: string) => string;
  description?: string;
  skipIfMissing?: boolean;
}

/**
 * Programmatically transforms a file's content — synchronous, no agent
 * interaction. Same behavior as the old `TransformFileStepMachine`.
 */
export const runTransformFileStep: StepFn<TransformFileStepInput> = async (
  rawInput,
  ctx,
) => {
  const input = rawInput as TransformFileStepInput;
  const resolvedPath = input.filePath.startsWith("/")
    ? input.filePath
    : path.join(ctx.cwd, input.filePath);
  const description = input.description ?? `Transform ${input.filePath}`;

  if (ctx.mode === "dry" || ctx.mode === "checklist") {
    ctx.log({ channel: "tool", level: "info", content: `Would ${description.toLowerCase()}` });
    return { status: "success" };
  }
  if (input.skipIfMissing && !existsSync(resolvedPath)) {
    return { status: "success" };
  }

  const content = readFileSync(resolvedPath, "utf-8");
  const updated = input.transform(content);
  writeFileSync(resolvedPath, updated, "utf-8");

  ctx.log({ channel: "tool", level: "info", content: description });
  return { status: "success" };
};
