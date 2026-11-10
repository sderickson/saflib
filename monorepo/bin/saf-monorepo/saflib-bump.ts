import type { Command } from "commander";
import { runSaflibBump } from "../../src/saflib-bump/run.ts";

export const addSaflibBumpCommand = (program: Command) => {
  program
    .command("saflib-bump")
    .description(
      "In a product repo: move saflib/ to saflib's main (fetched first; never backwards), copy saflib's overrides, re-resolve package-lock.json and run lock-prune --fix. Leaves the changes for you to test and commit.",
    )
    .option("--root <dir>", "product monorepo root (default: auto-detect)")
    .option("--ref <ref>", "saflib ref to move to", "origin/main")
    .action(async (options: { root?: string; ref: string }) => {
      process.exit(
        await runSaflibBump({ rootDir: options.root, ref: options.ref }),
      );
    });
};
