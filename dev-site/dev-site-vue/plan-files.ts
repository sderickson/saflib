/**
 * Pure helpers for grouping/navigating plan-folder files — shared by
 * `PlansPage.vue` (the nav list) and `run-orchestrator.ts` (the "play
 * current plan" cascade, which needs to find the next phase file without
 * depending on any specific mounted page component).
 */

/**
 * Repo-relative directory that holds dated plan folders.
 * Matches the on-disk convention (`product/plans/notes/<date>-<name>/`)
 * used by pathclerk, vendata, and the SAF process templates — not a
 * hardcoded product name.
 */
export function plansPrefix(productRoot: string | undefined): string {
  const root = (productRoot ?? "").replace(/^\/+|\/+$/g, "");
  return root ? `${root}/plans/notes` : "plans/notes";
}

export type PlanFileKind = "markdown" | "workflow" | "text";

export function fileKindOf(name: string): PlanFileKind {
  if (/\.md$/i.test(name)) return "markdown";
  if (/\.ya?ml$/i.test(name)) return "workflow";
  return "text";
}

export interface PlanFileEntry {
  name: string;
  path: string;
}

export interface PlanGroup {
  folder: string;
  name: string;
  files: PlanFileEntry[];
}

/** Groups a flat file list (as returned by `GET /repo/files`) by immediate plan subfolder. */
export function groupPlanFiles(
  files: { path: string }[],
  prefix: string,
): PlanGroup[] {
  const groups = new Map<string, PlanFileEntry[]>();
  const prefixSlash = `${prefix}/`;
  for (const f of files) {
    if (!f.path.startsWith(prefixSlash) && f.path !== prefix) continue;
    const rel = f.path.slice(prefix.length + 1);
    const slashIndex = rel.indexOf("/");
    // A file sitting directly under plans/notes/, not inside its own dated
    // folder — grouped under a synthetic "_" folder rather than dropped.
    const folder = slashIndex === -1 ? "_" : rel.slice(0, slashIndex);
    const name = slashIndex === -1 ? rel : rel.slice(slashIndex + 1);
    const arr = groups.get(folder) ?? [];
    arr.push({ name, path: f.path });
    groups.set(folder, arr);
  }
  return Array.from(groups.entries())
    .map(([folder, groupFiles]) => ({
      folder,
      name: folder === "_" ? "(ungrouped)" : folder.replace(/^\d{4}-\d{2}-\d{2}-/, ""),
      files: groupFiles.sort((a, b) => a.name.localeCompare(b.name)),
    }))
    // Folder names are date-prefixed — descending sort puts the newest first.
    .sort((a, b) => b.folder.localeCompare(a.folder));
}

/** The next workflow file alphabetically after `currentFileName` in the same plan folder, if any. */
export function findNextPlanFile(
  groups: PlanGroup[],
  folder: string,
  currentFileName: string,
): PlanFileEntry | undefined {
  const group = groups.find((g) => g.folder === folder);
  if (!group) return undefined;
  return group.files.find((f) => f.name > currentFileName && fileKindOf(f.name) === "workflow");
}

/** Splits a plan file's repo-relative path into its folder + file name, per `groupPlanFiles`' own grouping convention. */
export function parsePlanFilePath(
  path: string,
  prefix: string,
): { folder: string; fileName: string } | undefined {
  if (!path.startsWith(`${prefix}/`)) return undefined;
  const rel = path.slice(prefix.length + 1);
  const slashIndex = rel.indexOf("/");
  const folder = slashIndex === -1 ? "_" : rel.slice(0, slashIndex);
  const fileName = slashIndex === -1 ? rel : rel.slice(slashIndex + 1);
  return { folder, fileName };
}

export function planFileHref(folder: string, name: string): string {
  return `/plans/${encodeURIComponent(folder)}/${encodeURIComponent(name)}`;
}
