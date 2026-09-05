#!/usr/bin/env -S node --experimental-strip-types --disable-warning=ExperimentalWarning

import { Command } from "commander";
import { setupContext } from "@saflib/commander";
import { resolveOrganizationName, runBootstrap } from "./bootstrap.ts";
import {
  DEFAULT_SAFLIB_REF,
  DEFAULT_SAFLIB_REPO,
} from "./constants.ts";

const program = new Command()
  .name("saf-create")
  .description(
    "Bootstrap a new SAF monorepo in an empty git repository (add saflib submodule, then run product/init).",
  )
  .argument("<name>", "Product name in kebab-case (example: my-app)")
  .argument("<domain>", "Primary domain (example: example.com)")
  .option(
    "--org <name>",
    "npm organization scope for @org/product packages (default: same as product name)",
  )
  .option(
    "--saflib-repo <url>",
    "Git URL for the saflib submodule",
    DEFAULT_SAFLIB_REPO,
  )
  .option(
    "--saflib-ref <ref>",
    "Branch, tag, or commit to check out in saflib after submodule add",
    DEFAULT_SAFLIB_REF,
  )
  .option(
    "--force",
    "Continue even if product/, deploy/, or .github/ already exist",
    false,
  )
  .option(
    "--product-only",
    "Pass --productOnly through to product/init (skip deploy/scaffold/kratos)",
    false,
  )
  .action((name: string, domain: string, options) => {
    try {
      runBootstrap({
        cwd: process.cwd(),
        productName: name,
        domain,
        organizationName: resolveOrganizationName(name, options.org),
        saflibRepo: options.saflibRepo,
        saflibRef: options.saflibRef,
        force: options.force,
        productOnly: options.productOnly,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(message);
      process.exit(1);
    }
  });

setupContext({ serviceName: "saf-create" }, () => {
  program.parse(process.argv);
});
