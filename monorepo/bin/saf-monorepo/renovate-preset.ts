import type { Command } from "commander";
import path from "node:path";
import { writeRenovatePresets } from "../../src/renovate-preset/generate.ts";

export const addRenovatePresetCommand = (program: Command) => {
  program
    .command("renovate-preset")
    .description(
      "Generate saflib's Renovate presets for product repos (renovate/product.json turns off every package saflib owns). Run from saflib's root; --check fails if they're out of date.",
    )
    .option("--check", "only report whether the presets are up to date")
    .action((options: { check?: boolean }) => {
      const saflibDir = path.resolve(import.meta.dirname, "../../..");
      const stale = writeRenovatePresets(saflibDir, { check: options.check });
      if (stale.length === 0) {
        console.log("Renovate presets are up to date.");
        return;
      }
      for (const rel of stale) {
        console.log(`${options.check ? "out of date" : "wrote"}: ${rel}`);
      }
      if (options.check) {
        console.log("Run `npx saf-monorepo renovate-preset` in saflib.");
        process.exit(1);
      }
    });
};
