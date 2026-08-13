import type { Command } from "commander";
import { throwError } from "@saflib/monorepo";
import { devSiteDb } from "@saflib/dev-site-db/instances";
import { getCommit } from "../../get-commit.ts";
import {
  resolveDbPath,
  resolveMainRef,
  resolveProductRoot,
  resolveRepoRoot,
} from "./defaults.ts";
import { ensureCliDbAvailable } from "./ensure-db.ts";

export const addShowCommand = (program: Command) => {
  program
    .command("show")
    .description("Print the full analysis snapshot for a commit hash.")
    .argument("<hash>", "Commit hash")
    .option("--repo-root <path>", "Git repository root")
    .option("--product-root <path>", "Path prefix within the repo")
    .option("--main-ref <ref>", "Main branch ref")
    .option("--db <path>", "SQLite file path")
    .action(
      async (
        hash: string,
        opts: {
          db?: string;
          repoRoot?: string;
          productRoot?: string;
          mainRef?: string;
        },
      ) => {
        const repoRoot = resolveRepoRoot(opts.repoRoot);
        const dbPath = resolveDbPath(repoRoot, opts.db);
        ensureCliDbAvailable(dbPath, "read");
        const productRoot = resolveProductRoot(opts.productRoot, dbPath);
        const mainRef = resolveMainRef(opts.mainRef);
        const dbKey = devSiteDb.connect({
          onDisk: dbPath,
          readonly: true,
          skipMigrations: true,
        });
        try {
          const result = await throwError(
            getCommit(dbKey, hash, {
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
