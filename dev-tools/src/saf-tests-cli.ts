#!/usr/bin/env node --experimental-strip-types --disable-warning=ExperimentalWarning

import { Command } from "commander";
import { gatherHealthAssets } from "./test-assets.ts";
import { genCoverage } from "./test-coverage.ts";
import { setupContext } from "@saflib/commander";

const program = new Command()
  .name("saf-tests")
  .description("Manages test assets from e2e and unit tests.");

program
  .command("generate-coverage")
  .description(
    "Generate unit test coverage, running `vitest run --coverage` in each package with tests.",
  )
  .action(async () => {
    await genCoverage();
  });

program
  .command("gather-assets")
  .description(
    "Gathers coverage and screenshot assets from unit and e2e tests respectively, creating a manifest file and depositing everything in the target dir.",
  )
  .argument("<target-dir>", "The directory to gather the test assets into.")
  .action(async (targetDir) => {
    const result = await gatherHealthAssets(targetDir);
    console.log(
      `Manifest results:\n- packages: ${result.packages.length}\n- e2e tests with screenshots: ${result.e2eTestsWithScreenshots.length}\n- unit test coverage reports: ${result.unitTestCoverageReports.length}`,
    );
  });

setupContext({ serviceName: "saf-tests" }, () => {
  program.parse(process.argv);
});
