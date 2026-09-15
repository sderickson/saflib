import { readdirSync } from "node:fs";
import path from "node:path";
import { createHandler } from "@saflib/express";
import createError from "http-errors";
import type { NewWorkflowsResponseBody } from "@saflib/new-workflows-spec";
import { newWorkflowsHttpStorage } from "../../context.ts";

const CONFIG_EXTENSIONS = new Set([".yaml", ".yml", ".json"]);

export const listPlansHandler = createHandler(async (_req, res) => {
  const ctx = newWorkflowsHttpStorage.getStore()!;
  if (!ctx.plansRoot) {
    throw createError(500, "This host hasn't configured a plans folder.");
  }
  const plansRoot = ctx.plansRoot;

  const folders = safeReaddirDirs(plansRoot);
  const plans = folders
    .map((folder) => {
      const folderPath = path.join(plansRoot, folder);
      const files = readdirSync(folderPath)
        .filter((name) => CONFIG_EXTENSIONS.has(path.extname(name)))
        .sort()
        .map((name) => ({
          name,
          path: path.relative(ctx.defaultCwd, path.join(folderPath, name)),
        }));
      // Strip the leading `<date>-` prefix for the display name; keep the
      // whole folder name if it doesn't look date-prefixed.
      const name = folder.replace(/^\d{4}-\d{2}-\d{2}-/, "");
      return { folder, name, files };
    })
    .filter((plan) => plan.files.length > 0)
    .sort((a, b) => b.folder.localeCompare(a.folder));

  const response: NewWorkflowsResponseBody["listPlans"][200] = { plans };
  res.status(200).json(response);
});

function safeReaddirDirs(root: string): string[] {
  let entries;
  try {
    entries = readdirSync(root, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries.filter((e) => e.isDirectory()).map((e) => e.name);
}
