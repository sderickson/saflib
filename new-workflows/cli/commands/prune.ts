import {
  pruneWorkflowHistory,
  DEFAULT_LOG_RETENTION_DAYS,
  DEFAULT_RAW_OUTPUT_RETENTION_DAYS,
} from "@saflib/new-workflows";
import type { CliContext } from "../types.ts";

export function addPruneCommand(ctx: CliContext): void {
  ctx.program
    .command("prune")
    .description(
      "Delete old finished runs' logs and raw agent output. Runs, steps, and agent turns are kept.",
    )
    .option(
      "--raw-days <days>",
      "Keep raw agent output this many days",
      String(DEFAULT_RAW_OUTPUT_RETENTION_DAYS),
    )
    .option("--log-days <days>", "Keep logs this many days", String(DEFAULT_LOG_RETENTION_DAYS))
    .action(async (options: { rawDays: string; logDays: string }) => {
      const rawOutputDays = Number(options.rawDays);
      const logDays = Number(options.logDays);
      if (!(rawOutputDays >= 0) || !(logDays >= 0)) {
        console.error("--raw-days and --log-days must be non-negative numbers.");
        process.exitCode = 1;
        return;
      }
      const result = await pruneWorkflowHistory(ctx.dbKey, { rawOutputDays, logDays });
      console.log(
        `Deleted ${result.logRowsDeleted} log rows from ${result.runsPruned} runs and ${result.rawRowsDeleted} raw agent outputs${result.vacuumed ? "; vacuumed the database" : ""}.`,
      );
    });
}
