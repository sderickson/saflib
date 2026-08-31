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
import { ensureCliDbAvailable } from "./ensure-db.ts";

export const addDiffCommand = (program: Command) => {
  program
    .command("diff")
    .description("Diff two analyzed commits (before after).")
    .argument("<from_hash>", "Baseline commit hash (before)")
    .argument("<to_hash>", "Comparison commit hash (after)")
    .option("--repo-root <path>", "Git repository root")
    .option("--product-root <path>", "Path prefix within the repo")
    .option("--main-ref <ref>", "Main branch ref")
    .option("--db <path>", "SQLite file path")
    .action(
      async (
        from_hash: string,
        to_hash: string,
        opts: {
          db?: string;
          repo_root?: string;
          product_root?: string;
          mainRef?: string;
        },
      ) => {
        const repo_root = resolveRepoRoot(opts.repo_root);
        const dbPath = resolveDbPath(repo_root, opts.db);
        ensureCliDbAvailable(dbPath, "read");
        const product_root = resolveProductRoot(opts.product_root, dbPath);
        const mainRef = resolveMainRef(opts.mainRef);
        const dbKey = devSiteDb.connect({
          onDisk: dbPath,
          readonly: true,
          skipMigrations: true,
        });
        try {
          const result = await throwError(
            diffCommits(dbKey, from_hash, to_hash, {
              repo_root,
              product_root: product_root || undefined,
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
