import type { Command } from "commander";
import { throwError } from "@saflib/monorepo";
import { devSiteDb } from "@saflib/dev-site-db/instances";
import { diffCommits } from "../../diff-commits.ts";

export const addDiffCommand = (program: Command) => {
  program
    .command("diff")
    .description("Diff two analyzed commits (before after).")
    .argument("<fromHash>", "Baseline commit hash (before)")
    .argument("<toHash>", "Comparison commit hash (after)")
    .option(
      "--db <path>",
      "SQLite file path. Defaults to an on-disk file under @saflib/dev-site-db/data/.",
    )
    .action(async (fromHash: string, toHash: string, opts: { db?: string }) => {
      const dbKey = devSiteDb.connect({
        onDisk: opts.db ?? true,
      });
      try {
        const result = await throwError(diffCommits(dbKey, fromHash, toHash));
        console.log(JSON.stringify(result, null, 2));
      } finally {
        devSiteDb.disconnect(dbKey);
      }
    });
};
