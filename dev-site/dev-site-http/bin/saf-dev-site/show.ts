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
      "--repo-root <path>",
      "Git repository root (needed to assemble exports/tests from blob facts)",
      process.cwd(),
    )
    .option(
      "--product-root <path>",
      "Path prefix within the repo (e.g. daemon)",
      "",
    )
    .option("--main-ref <ref>", "Main branch ref", "main")
    .option(
      "--db <path>",
      "SQLite file path. Defaults to an on-disk file under @saflib/dev-site-db/data/.",
    )
    .action(
      async (
        hash: string,
        opts: {
          db?: string;
          repoRoot: string;
          productRoot: string;
          mainRef: string;
        },
      ) => {
        const dbKey = devSiteDb.connect({
          onDisk: opts.db ?? true,
        });
        try {
          const result = await throwError(
            getCommit(dbKey, hash, {
              repoRoot: opts.repoRoot,
              productRoot: opts.productRoot || undefined,
              mainRef: opts.mainRef,
            }),
          );
          console.log(JSON.stringify(result, null, 2));
        } finally {
          devSiteDb.disconnect(dbKey);
        }
      },
    );
};
