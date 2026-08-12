import type { Command } from "commander";
import { throwError } from "@saflib/monorepo";
import { devSiteDb } from "@saflib/dev-site-db/instances";
import { getCommit } from "../../get-commit.ts";

export const addShowCommand = (program: Command) => {
  program
    .command("show")
    .description("Print the full analysis snapshot for a commit hash.")
    .argument("<hash>", "Commit hash")
    .option(
      "--db <path>",
      "SQLite file path. Defaults to an on-disk file under @saflib/dev-site-db/data/.",
    )
    .action(async (hash: string, opts: { db?: string }) => {
      const dbKey = devSiteDb.connect({
        onDisk: opts.db ?? true,
      });
      try {
        const result = await throwError(getCommit(dbKey, hash));
        console.log(JSON.stringify(result, null, 2));
      } finally {
        devSiteDb.disconnect(dbKey);
      }
    });
};
