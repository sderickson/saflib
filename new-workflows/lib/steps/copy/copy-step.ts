import path from "node:path";
import fs, {
  existsSync,
  readdirSync,
  statSync,
  type Dirent,
} from "node:fs";
import { readFile, writeFile, copyFile, mkdir } from "node:fs/promises";
import { minimatch } from "minimatch";
import {
  kebabCaseToSnakeCase,
  kebabCaseToPascalCase,
  kebabCaseToCamelCase,
} from "../../strings.ts";
import {
  resolveTemplateWorkflowAreas,
  updateWorkflowAreas,
  validateWorkflowAreas,
} from "./inline/index.ts";
import type { StepFn } from "../../types.ts";

export interface CopyStepInput {
  /** Ids map to absolute source paths (files or directories) to copy. */
  templateFiles: Record<string, string>;
  /** kebab-case name of the thing being created; replaces `template-file` etc. */
  name?: string;
  targetDir: string;
  lineReplace?: (line: string) => string;
  flags?: Record<string, boolean>;
  skipSourceGlobs?: string[];
  skipSourcePath?: (fullPath: string) => boolean;
  skipUnlessPathExists?: string;
}

/** Always skipped when expanding directory template sources. */
export const DEFAULT_SKIP_SOURCE_GLOBS = [
  "**/node_modules/**",
  "**/dist/**",
  "**/playwright-report/**",
  "**/test-results/**",
  "**/*.sqlite",
  "**/*.sqlite-*",
  "**/migrations/**",
];

const BINARY_EXTENSIONS = new Set([
  ".sqlite",
  ".db",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".ico",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
  ".pdf",
  ".zip",
  ".gz",
]);

function shouldSkipSourcePath(fullPath: string, input: CopyStepInput): boolean {
  const normalized = fullPath.split(path.sep).join("/");
  const globs = [...DEFAULT_SKIP_SOURCE_GLOBS, ...(input.skipSourceGlobs ?? [])];
  if (globs.some((pattern) => minimatch(normalized, pattern, { dot: true }))) {
    return true;
  }
  return input.skipSourcePath?.(fullPath) ?? false;
}

function transformName(
  originalName: string,
  targetName: string | undefined,
  lineReplace: ((line: string) => string) | undefined,
): string {
  let result = originalName;
  if (targetName) {
    result = result.replace(/template-file/g, targetName);
    result = result.replace(/template_file/g, kebabCaseToSnakeCase(targetName));
    result = result.replace(/TemplateFile/g, kebabCaseToPascalCase(targetName));
  }
  if (lineReplace) {
    result = lineReplace(result);
  }
  return result;
}

function transformLine(
  line: string,
  name: string | undefined,
  lineReplace: ((line: string) => string) | undefined,
  snakeName: string,
  pascalName: string,
  camelName: string,
): string {
  if (line.includes("DELETE_THIS_LINE")) return "";
  if (line.includes("/* do not replace */")) return line;
  let out = lineReplace ? lineReplace(line) : line;
  if (name) {
    out = out.replace(/template-file/g, name);
    out = out.replace(/template_file/g, snakeName);
    out = out.replace(/TemplateFile/g, pascalName);
    out = out.replace(/templateFile/g, camelName);
    out = out.replace(/TEMPLATE_FILE/g, snakeName.toUpperCase());
  }
  return out;
}

function processFileContent(
  contentLines: string[],
  name: string | undefined,
  lineReplace: ((line: string) => string) | undefined,
  workflowId: string,
  flags: Record<string, boolean> | undefined,
): string[] {
  const resolvedLines = resolveTemplateWorkflowAreas(contentLines, workflowId, flags);
  const snakeName = kebabCaseToSnakeCase(name || "");
  const pascalName = kebabCaseToPascalCase(name || "");
  const camelName = kebabCaseToCamelCase(name || "");
  return resolvedLines.map((line) =>
    transformLine(line, name, lineReplace, snakeName, pascalName, camelName),
  );
}

/** Flattens directory template sources into individual file entries. */
function flattenTemplateFiles(input: CopyStepInput): Record<string, string> {
  const flattened: Record<string, string> = {};
  for (const key of Object.keys(input.templateFiles)) {
    const sourcePath = input.templateFiles[key];
    const stats = statSync(sourcePath);
    if (!stats.isDirectory()) {
      flattened[key] = sourcePath;
      continue;
    }
    const files = readdirSync(sourcePath, {
      recursive: true,
      withFileTypes: true,
    }) as Dirent[];
    let i = 0;
    for (const file of files) {
      if (!file.isFile()) continue;
      const fullPath = path.join(file.parentPath, file.name);
      if (shouldSkipSourcePath(fullPath, input)) continue;
      flattened[`${key}-${i++}`] = fullPath;
    }
  }
  return flattened;
}

function sharedPrefixOf(paths: string[]): string {
  if (paths.length === 1) {
    const only = paths[0];
    return fs.statSync(only).isDirectory() ? only : path.dirname(only);
  }
  let sharedPrefixIndex = 0;
  outer: for (let i = 0; i < paths[0].length; i++) {
    for (let j = 0; j < paths.length; j++) {
      if (paths[j][i] !== paths[0][i]) break outer;
    }
    sharedPrefixIndex = i;
  }
  let prefix = paths[0].slice(0, sharedPrefixIndex);
  if (!fs.existsSync(prefix) || fs.statSync(prefix).isFile()) {
    prefix = path.dirname(prefix);
  }
  return prefix;
}

async function copyAndRenameOneFile(params: {
  fileId: string;
  sourcePath: string;
  sharedPrefix: string;
  targetDir: string;
  name: string | undefined;
  lineReplace: ((line: string) => string) | undefined;
  workflowId: string;
  flags: Record<string, boolean> | undefined;
}): Promise<{ fileName: string; filePath: string; fileExisted: boolean }> {
  const { sourcePath, sharedPrefix, targetDir, name, lineReplace, workflowId, flags } =
    params;
  const relativePath = path.relative(sharedPrefix, sourcePath);
  let intermediaryDir = relativePath.includes("/") ? path.dirname(relativePath) : "";
  if (lineReplace) intermediaryDir = lineReplace(intermediaryDir);
  const targetFileName = transformName(path.basename(sourcePath), name, lineReplace);
  const targetPath = path.join(targetDir, intermediaryDir, targetFileName);

  const fileExisted = fs.existsSync(targetPath);
  if (fileExisted) {
    const targetContent = await readFile(targetPath, "utf-8");
    const targetLines = targetContent.split(/\r?\n/);
    const sourceContent = await readFile(sourcePath, "utf-8");
    const sourceLines = sourceContent.split(/\r?\n/);

    validateWorkflowAreas({
      sourceLines,
      targetLines,
      targetPath,
      sourcePath,
      workflowId,
    });

    const updatedLines = updateWorkflowAreas({
      targetLines,
      targetPath,
      sourceLines,
      workflowId,
      lineReplace: lineReplace || ((line) => line),
      flags,
    });

    const lineEnding = targetContent.includes("\r\n") ? "\r\n" : "\n";
    await writeFile(targetPath, updatedLines.join(lineEnding), "utf-8");
    return { fileName: targetFileName, filePath: targetPath, fileExisted: true };
  }

  if (!fs.existsSync(path.dirname(targetPath))) {
    await mkdir(path.dirname(targetPath), { recursive: true });
  }
  await copyFile(sourcePath, targetPath);

  if (!BINARY_EXTENSIONS.has(path.extname(targetPath).toLowerCase())) {
    const content = await readFile(targetPath, "utf-8");
    if (!content.includes("\0")) {
      const updated = processFileContent(
        content.split("\n"),
        name,
        lineReplace,
        workflowId,
        flags,
      );
      await writeFile(targetPath, updated.join("\n"));
    }
  }

  return { fileName: targetFileName, filePath: targetPath, fileExisted: false };
}

/**
 * Copies `templateFiles` into `targetDir`, resolving workflow-area markers and
 * running `lineReplace` — a mechanical port of the old CopyStepMachine's file
 * loop with the XState per-file states collapsed into a plain `for` loop.
 */
export const runCopyStep: StepFn<CopyStepInput> = async (rawInput, ctx) => {
  const input = rawInput as CopyStepInput;

  if (input.skipUnlessPathExists) {
    const requiredPath = input.skipUnlessPathExists.startsWith("/")
      ? input.skipUnlessPathExists
      : path.join(ctx.cwd, input.skipUnlessPathExists);
    if (!existsSync(requiredPath)) {
      ctx.log({
        channel: "tool",
        level: "info",
        content: `Skipping copy: ${requiredPath} does not exist.`,
      });
      return { status: "success", result: { copiedFiles: {} } };
    }
  }

  const templateFiles = flattenTemplateFiles(input);
  const fileIds = Object.keys(templateFiles);
  const sharedPrefix = sharedPrefixOf(Object.values(templateFiles));
  const copiedFiles: Record<string, string> = {};

  if (ctx.mode === "dry" || ctx.mode === "checklist") {
    for (const fileId of fileIds) {
      const targetFileName = transformName(
        path.basename(templateFiles[fileId]),
        input.name,
        input.lineReplace,
      );
      copiedFiles[fileId] = path.join(input.targetDir, targetFileName);
    }
    ctx.log({
      channel: "tool",
      level: "info",
      content: `Would upsert ${fileIds.length} template file(s) (mode: ${ctx.mode}).`,
    });
    return { status: "success", result: { copiedFiles } };
  }

  for (const fileId of fileIds) {
    const { fileName, filePath, fileExisted } = await copyAndRenameOneFile({
      fileId,
      sourcePath: templateFiles[fileId],
      sharedPrefix,
      targetDir: input.targetDir,
      name: input.name,
      lineReplace: input.lineReplace,
      workflowId: ctx.workflowId,
      flags: input.flags,
    });
    copiedFiles[fileId] = filePath;
    ctx.log({
      channel: "tool",
      level: "info",
      content: fileExisted
        ? `Updated "${fileName}" from template`
        : `Generated "${fileName}" from template`,
    });
  }

  return { status: "success", result: { copiedFiles } };
};
