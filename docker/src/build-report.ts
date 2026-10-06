import type { BuildResult } from "./build-images.ts";

export interface BuildReportMeta {
  startedAt: Date;
  contextDir: string;
  platform?: string;
  registry?: string;
  push?: boolean;
  dryRun?: boolean;
}

const cell = (value: string | undefined) =>
  (value ?? "").replace(/\|/g, "\\|") || "—";

/**
 * Markdown summary of a `saf-docker build` run — every image's outcome,
 * step counts (cached vs rebuilt), log file and Docker Desktop link — for
 * people and agents to read after the fact. Written to
 * `.saf-docker/build-report.md` (gitignored).
 */
export function formatBuildReport(
  results: BuildResult[],
  meta: BuildReportMeta,
): string {
  const count = (o: BuildResult["outcome"]) =>
    results.filter((r) => r.outcome === o).length;
  const lines = [
    "# saf-docker build report",
    "",
    `- Started: ${meta.startedAt.toISOString()}`,
    `- Context: ${meta.contextDir}`,
    `- Platform: ${meta.platform ?? "native"}`,
    `- Registry: ${meta.registry ?? "none"}${meta.push ? " (push)" : ""}`,
    `- Mode: ${meta.dryRun ? "dry run" : "build"}`,
    `- Images: ${results.length} — ${count("built")} built, ${count("up-to-date")} up to date, ` +
      `${count("pulled")} pulled, ${count("in-registry")} in registry, ` +
      `${count("failed")} failed, ${count("blocked")} blocked` +
      (meta.dryRun
        ? `, ${count("would-build")} would build, ${count("would-pull")} would pull`
        : ""),
    "",
    "| Image | Outcome | Tag | Time | Steps (cached / rebuilt / total) | Log | Docker Desktop |",
    "| --- | --- | --- | --- | --- | --- | --- |",
  ];
  for (const r of results) {
    const steps = r.steps
      ? `${r.steps.cached} / ${r.steps.executed} / ${r.steps.total}`
      : undefined;
    lines.push(
      `| ${cell(r.image)}${r.dirty ? " (dirty)" : ""} | ${r.outcome} | ${cell(r.tag)} | ` +
        `${(r.durationMs / 1000).toFixed(1)}s | ${cell(steps)} | ${cell(r.logFile)} | ${cell(r.detailsUrl)} |`,
    );
  }
  const problems = results.filter((r) => r.error);
  if (problems.length > 0) {
    lines.push("", "## Errors", "");
    for (const r of problems)
      lines.push(`- **${r.image}** (${r.ref}): ${r.error}`);
  }
  return lines.join("\n") + "\n";
}
