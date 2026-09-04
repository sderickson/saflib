#!/usr/bin/env -S node --experimental-strip-types --disable-warning=ExperimentalWarning
import { Command } from "commander";
import { setupContext } from "@saflib/commander";
import { addMeasureCommand } from "./measure.ts";
import { addWhyCommand } from "./why.ts";
import { addCyclesCommand } from "./cycles.ts";
import { addSnapshotCommand } from "./snapshot.ts";
import { addTsconfigCommand } from "./tsconfig.ts";
import { addSpaCommand } from "./spa.ts";

const program = new Command()
  .name("saf-imports")
  .description(
    "Measure and enforce import graphs for SAF monorepo packages",
  );

addMeasureCommand(program);
addWhyCommand(program);
addCyclesCommand(program);
addSnapshotCommand(program);
addTsconfigCommand(program);
addSpaCommand(program);

setupContext(
  {
    serviceName: "saf-imports",
  },
  () => {
    program.parse(process.argv);
  },
);
