import type { Command } from "commander";
import { throwError } from "@saflib/monorepo";
import { devSiteDb } from "@saflib/dev-site-db/instances";
import { scanCommits } from "../../scan.ts";

export const addScanCommand = (program: Command) => {
  program
    .command("scan")
    .description(
      "Ingest mainline commits newest-first from tip (plus feature-branch tips when --limit is unset).",
    )
    .option(
      "--repo-root <path>",
      "Git repository root to analyze",
      process.cwd(),
    )
    .option(
      "--product-root <path>",
      "Path prefix within the repo (e.g. products)",
      "",
    )
    .option("--main-ref <ref>", "Main branch ref", "main")
    .option(
      "--db <path>",
      "SQLite file path (created if missing). Defaults to an on-disk file under @saflib/dev-site-db/data/.",
    )
    .option(
      "--limit <n>",
      "Max new commits to analyze this run (newest unanalyzed first)",
      (v) => Number(v),
    )
    .action(async (opts: {
      repoRoot: string;
      productRoot: string;
      mainRef: string;
      db?: string;
      limit?: number;
    }) => {
      const dbKey = devSiteDb.connect({
        onDisk: opts.db ?? true,
      });
      try {
        const result = await throwError(
          scanCommits(dbKey, {
            repoRoot: opts.repoRoot,
            productRoot: opts.productRoot || undefined,
            mainRef: opts.mainRef,
            limit: opts.limit,
          }),
        );
        console.log(JSON.stringify(result, null, 2));
      } finally {
        devSiteDb.disconnect(dbKey);
      }
    });
};
