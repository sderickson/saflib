import {
  buildStepTree,
  formatStepTree,
  gotoRunStep,
  parseGotoPath,
  GotoPathError,
} from "@saflib/new-workflows";
import type { CliContext } from "../types.ts";
import { readRunPointer } from "../run-pointer.ts";
import { cliCwd } from "../cli-cwd.ts";

/**
 * Jump the current run to a step path (e.g. `2/4` for a nested
 * call-workflow). With no argument, prints the step tree.
 */
export function addGotoCommand(ctx: CliContext): void {
  ctx.program
    .command("goto")
    .description(
      "Jump the current run to a step path (e.g. 2/4). Omit the path to list the step tree.",
    )
    .argument("[path]", "Slash-separated step indices (e.g. 2/4)")
    .action(async (pathArg?: string) => {
      const pointer = readRunPointer(cliCwd());
      if (!pointer) {
        console.error("No run found for this directory.");
        process.exitCode = 1;
        return;
      }

      try {
        if (!pathArg) {
          const tree = await buildStepTree(ctx.dbKey, pointer.runId, ctx.registry, {
            cwd: cliCwd(),
          });
          console.log(formatStepTree(tree) || "(no steps)");
          return;
        }

        const path = parseGotoPath(pathArg);
        const result = await gotoRunStep(ctx.dbKey, pointer.runId, path, ctx.registry, {
          cwd: cliCwd(),
        });
        console.log(
          `Run ${result.rootRunId} now at step ${pathArg} (leaf run ${result.leafRunId}, index ${result.leafStepIndex}).`,
        );
      } catch (error) {
        if (error instanceof GotoPathError) {
          console.error(error.message);
          try {
            const tree = await buildStepTree(ctx.dbKey, pointer.runId, ctx.registry, {
              cwd: cliCwd(),
            });
            console.error("\nCurrent step tree:");
            console.error(formatStepTree(tree) || "(no steps)");
          } catch {
            // Listing is best-effort after a path error.
          }
          process.exitCode = 1;
          return;
        }
        throw error;
      }
    });
}
