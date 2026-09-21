import { execFileSync } from "node:child_process";
import { resolveRef } from "@saflib/git";
import { previewRun, loadWorkflowDefinition, type PreviewStepEntry } from "@saflib/new-workflows";
import type { CliContext } from "../types.ts";
import { parseNamedArgs } from "../args.ts";

function findRepoRoot(cwd: string): string {
  return execFileSync("git", ["rev-parse", "--show-toplevel"], {
    cwd,
    encoding: "utf8",
  }).trim();
}

/**
 * Steps whose `applied: false` is expected (their kind just isn't
 * mechanically previewable) rather than a genuine failure — see
 * `previewRun`'s own walk, which only ever marks `copy`/`transform-file`
 * `applied: false` when the step itself threw (e.g. a `validateWorkflowAreas`
 * conflict), never as a plain skip.
 */
function isExpectedSkip(entry: PreviewStepEntry): boolean {
  return entry.kind !== "copy" && entry.kind !== "transform-file";
}

export function addPreviewCommand(ctx: CliContext): void {
  ctx.program
    .command("preview")
    .allowUnknownOption(true)
    .description(
      "Preview a workflow's copy/transform-file steps against the repo's current commit: " +
        "lists which files would be added or modified, without running anything for real.",
    )
    .argument("<id-or-path>", "Workflow id, or path to a workflow file")
    .argument("[args...]", "Named args for the workflow (--key=value)")
    .action(async (idOrPath: string, args: string[]) => {
      const cwd = process.cwd();
      const repoRoot = findRepoRoot(cwd);
      const definition = await loadWorkflowDefinition(idOrPath, ctx.registry, { cwd });
      const input = parseNamedArgs(args, definition.inputSchema);

      const { result: baseHash, error: refError } = resolveRef(repoRoot, "HEAD");
      if (refError) {
        console.error(`!!! ${refError.message}`);
        process.exitCode = 1;
        return;
      }

      const result = await previewRun(ctx.dbKey, definition, input, {
        repoRoot,
        baseHash: baseHash!,
        cwd,
      });

      const errors = result.entries.filter((e) => !e.applied && !isExpectedSkip(e));
      const skipped = result.entries.filter((e) => !e.applied && isExpectedSkip(e));
      const applied = result.entries.filter((e) => e.applied && e.files);

      const added = applied.flatMap((e) => e.files!.filter((f) => f.status === "added"));
      const modified = applied.flatMap((e) => e.files!.filter((f) => f.status === "modified"));

      if (added.length > 0) {
        console.log("Files that would be added:");
        for (const f of added) console.log(`  + ${f.path}`);
      }
      if (modified.length > 0) {
        console.log("Files that would be modified (existing file, via workflow area):");
        for (const f of modified) console.log(`  ~ ${f.path}`);
      }
      if (added.length === 0 && modified.length === 0) {
        console.log("No previewable file changes.");
      }
      if (skipped.length > 0) {
        console.log(
          `\n${skipped.length} step(s) need a real run to preview: ` +
            skipped.map((e) => `${e.kind} (${e.workflowId}, step ${e.stepIndex})`).join(", "),
        );
      }

      if (errors.length > 0) {
        console.error("\n!!! Preview failed:");
        for (const e of errors) {
          console.error(`  ${e.kind} (${e.workflowId}, step ${e.stepIndex}): ${e.reason}`);
        }
        process.exitCode = 1;
      }
    });
}
