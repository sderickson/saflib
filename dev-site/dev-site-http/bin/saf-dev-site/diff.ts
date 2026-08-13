import type { Command } from "commander";
import { throwError } from "@saflib/monorepo";
import { devSiteDb } from "@saflib/dev-site-db/instances";
import { diffCommits } from "../../diff-commits.ts";
import {
  resolveDbPath,
  resolveMainRef,
  resolveProductRoot,
  resolveRepoRoot,
} from "./defaults.ts";

export const addDiffCommand = (program: Command) => {
  program
    .command("diff")
    .description("Diff two analyzed commits (before after).")
    .argument("<fromHash>", "Baseline commit hash (before)")
    .argument("<toHash>", "Comparison commit hash (after)")
    .option("--repo-root <path>", "Git repository root")
    .option("--product-root <path>", "Path prefix within the repo")
    .option("--main-ref <ref>", "Main branch ref")
    .option("--db <path>", "SQLite file path")
    .action(
      async (
        fromHash: string,
        toHash: string,
        opts: {
          db?: string;
          repoRoot?: string;
          productRoot?: string;
          mainRef?: string;
        },
      ) => {
        const repoRoot = resolveRepoRoot(opts.repoRoot);
        const dbPath = resolveDbPath(repoRoot, opts.db);
        const productRoot = resolveProductRoot(opts.productRoot, dbPath);
        const mainRef = resolveMainRef(opts.mainRef);
        const dbKey = devSiteDb.connect({ onDisk: dbPath });
        try {
          const result = await throwError(
            diffCommits(dbKey, fromHash, toHash, {
              repoRoot,
              productRoot: productRoot || undefined,
              mainRef,
            }),
          );
          console.log(JSON.stringify(result, null, 2));
        } finally {
          devSiteDb.disconnect(dbKey);
        }
      },
    );
};
