import type { Command } from "commander";
import { findMonorepoRoot } from "../../src/resolve/index.ts";
import {
  analyzeSpaRouter,
  listGateSpas,
} from "../../src/spa/analyze-router.ts";
import { resolveClientsDistDir } from "../../src/spa/paths.ts";
import {
  measureSpaFromManifest,
  formatRouteCatalogEntry,
} from "../../src/spa/measure-spa.ts";

export const addSpaCommand = (program: Command) => {
  const spaCmd = program
    .command("spa")
    .description("Analyze and measure SPA client route bundles");

  spaCmd
    .command("analyze")
    .description("Parse router.ts and *Async.vue lazy boundaries (no build)")
    .requiredOption("--spa <name>", "SPA key from safImports.snapshot.bundles.spas")
    .option("--root <dir>", "Monorepo root")
    .action((options: { spa: string; root?: string }) => {
      const root = options.root
        ? options.root
        : findMonorepoRoot(process.cwd());
      const catalog = analyzeSpaRouter(root, options.spa);
      if (!catalog) {
        console.error(`Could not analyze SPA "${options.spa}"`);
        process.exitCode = 1;
        return;
      }
      console.log(JSON.stringify(catalog, null, 2));
    });

  spaCmd
    .command("measure")
    .description("Measure shell + per-route page chunks from vite manifest")
    .requiredOption("--spa <name>", "SPA key from safImports.snapshot.bundles.spas")
    .option("--root <dir>", "Monorepo root")
    .option(
      "--dist <dir>",
      "Dist directory (default: from safImports.snapshot.bundles.buildWorkspace/dist)",
    )
    .action((options: { spa: string; root?: string; dist?: string }) => {
      const root = options.root
        ? options.root
        : findMonorepoRoot(process.cwd());
      const catalog = analyzeSpaRouter(root, options.spa);
      if (!catalog) {
        console.error(`Could not analyze SPA "${options.spa}"`);
        process.exitCode = 1;
        return;
      }
      const distDir = options.dist ?? resolveClientsDistDir(root);
      if (!distDir) {
        console.error(
          "No client dist directory configured (set safImports.snapshot.bundles.buildWorkspace)",
        );
        process.exitCode = 1;
        return;
      }
      const result = measureSpaFromManifest(
        root,
        options.spa,
        catalog,
        distDir,
      );
      if (!result) {
        console.error("Manifest missing or SPA entry not found — run client build first");
        process.exitCode = 1;
        return;
      }
      console.log(JSON.stringify(result, null, 2));
    });

  spaCmd
    .command("measure-all")
    .description("Measure all gate SPAs")
    .option("--root <dir>", "Monorepo root")
    .action((options: { root?: string }) => {
      const root = options.root
        ? options.root
        : findMonorepoRoot(process.cwd());
      const out: Record<string, unknown> = {};
      for (const spa of listGateSpas(root)) {
        const catalog = analyzeSpaRouter(root, spa);
        if (!catalog) continue;
        out[spa] = measureSpaFromManifest(root, spa, catalog);
      }
      console.log(JSON.stringify(out, null, 2));
    });

  spaCmd
    .command("list-routes")
    .description("Print route catalog lines for one SPA")
    .requiredOption("--spa <name>", "SPA key")
    .option("--root <dir>", "Monorepo root")
    .action((options: { spa: string; root?: string }) => {
      const root = options.root
        ? options.root
        : findMonorepoRoot(process.cwd());
      const catalog = analyzeSpaRouter(root, options.spa);
      if (!catalog) {
        process.exitCode = 1;
        return;
      }
      for (const e of catalog.routes) {
        console.log(formatRouteCatalogEntry(e));
      }
    });
};
