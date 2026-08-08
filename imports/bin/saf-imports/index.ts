#!/usr/bin/env -S node --experimental-strip-types --disable-warning=ExperimentalWarning
import { Command } from "commander";
import { setupContext } from "@saflib/commander";
import { addMeasureCommand } from "./measure.ts";
import { addWhyCommand } from "./why.ts";
import { addCyclesCommand } from "./cycles.ts";
import { addBudgetCommand } from "./budget.ts";
import { addExportsCommand } from "./exports.ts";
import { addBaselineCommand } from "./baseline.ts";
import { addReferencesCommand } from "./references.ts";

const program = new Command()
  .name("saf-imports")
  .description(
    "Measure and enforce import-graph budgets for SAF monorepo packages",
  );

addMeasureCommand(program);
addWhyCommand(program);
addCyclesCommand(program);
addBudgetCommand(program);
addExportsCommand(program);
addBaselineCommand(program);
addReferencesCommand(program);

setupContext(
  {
    serviceName: "saf-imports",
  },
  () => {
    program.parse(process.argv);
  },
);
