import { execFileSync } from "node:child_process";
import { resolveRef } from "@saflib/git";
import {
  previewRun,
  loadWorkflowDefinition,
  isMechanicalPreviewFailure,
} from "@saflib/new-workflows";
import type { CliContext } from "../types.ts";
import { parseNamedArgs } from "../args.ts";
import { cliCwd } from "../cli-cwd.ts";

function findRepoRoot(cwd: string): string {
  return execFileSync("git", ["rev-parse", "--show-toplevel"], {
    cwd,
    encoding: "utf8",
  }).trim();
}

/**
 * Mechanical smoke test: run the same walk as `preview`, but only report
 * genuine copy/transform-file/cd failures (e.g. `validateWorkflowAreas`
 * mismatches). No file tree — exits 0 when clean, 1 when anything fails.
 */
export function addValidateCommand(ctx: CliContext): void {
  ctx.program
    .command("validate")
    .allowUnknownOption(true)
    .description(
      "Smoke-check a workflow's mechanical steps (copy/transform-file/cd) against HEAD. " +
        "Fails on template/area/path errors; ignores prompt/command/update steps.",
    )
    .argument("<id-or-path>", "Workflow id, or path to a workflow file")
    .argument("[args...]", "Named args for the workflow (--key=value)")
    .action(async (idOrPath: string, args: string[]) => {
      const cwd = cliCwd();
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

      const errors = result.entries.filter(isMechanicalPreviewFailure);
      if (errors.length === 0) {
        console.log(`OK — ${definition.id}: no mechanical failures.`);
        return;
      }

      console.error(`!!! Validate failed (${errors.length} error(s)):`);
      for (const e of errors) {
        console.error(`  ${e.kind} (${e.workflowId}, step ${e.stepIndex}): ${e.reason}`);
      }
      process.exitCode = 1;
    });
}
