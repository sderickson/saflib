import type { Command } from "commander";
import { throwError } from "@saflib/monorepo";
import { devSiteDb } from "@saflib/dev-site-db/instances";
import { recomputeIssueStats, scanCommits } from "../../scan.ts";
import {
  resolveDbPath,
  resolveMainRef,
  resolveProductRoot,
  resolveRepoRoot,
} from "./defaults.ts";
import { ensureCliDbAvailable } from "./ensure-db.ts";

export const addScanCommand = (program: Command) => {
  program
    .command("scan")
    .description(
      "Ingest mainline commits newest-first from tip (plus feature-branch tips when --limit is unset).",
    )
    .option("--repo-root <path>", "Git repository root to analyze")
    .option("--product-root <path>", "Path prefix within the repo (e.g. daemon)")
    .option("--main-ref <ref>", "Main branch ref")
    .option(
      "--db <path>",
      "SQLite file path (created if missing; scan refuses if Docker api holds the shared daemon DB)",
    )
    .option(
      "--limit <n>",
      "Max new commits to analyze this run (newest unanalyzed first)",
      (v) => Number(v),
    )
    .option(
      "--recompute-issues",
      "Backfill/refresh package_issue_stats for already-analyzed commits (skips ingest)",
    )
    .option(
      "--force",
      "With --recompute-issues, replace existing issue stats",
    )
    .option(
      "--commit <hash>",
      "With --recompute-issues, only this analyzed commit; otherwise scan only this hash",
    )
    .action(async (opts: {
      repoRoot?: string;
      productRoot?: string;
      mainRef?: string;
      db?: string;
      limit?: number;
      recomputeIssues?: boolean;
      force?: boolean;
      commit?: string;
    }) => {
      const repoRoot = resolveRepoRoot(opts.repoRoot);
      const dbPath = resolveDbPath(repoRoot, opts.db);
      ensureCliDbAvailable(dbPath, "write");
      const productRoot = resolveProductRoot(opts.productRoot, dbPath);
      const mainRef = resolveMainRef(opts.mainRef);
      const dbKey = devSiteDb.connect({ onDisk: dbPath });
      try {
        if (opts.recomputeIssues) {
          const result = await throwError(
            recomputeIssueStats(dbKey, {
              repoRoot,
              productRoot: productRoot || undefined,
              mainRef,
              commitHash: opts.commit,
              limit: opts.limit,
              force: opts.force,
            }),
          );
          console.log(JSON.stringify(result, null, 2));
          return;
        }
        const result = await throwError(
          scanCommits(dbKey, {
            repoRoot,
            productRoot: productRoot || undefined,
            mainRef,
            limit: opts.limit,
            commitHash: opts.commit,
          }),
        );
        console.log(JSON.stringify(result, null, 2));
      } finally {
        devSiteDb.disconnect(dbKey);
      }
    });
};
