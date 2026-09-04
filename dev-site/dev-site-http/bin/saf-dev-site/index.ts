#!/usr/bin/env -S node --experimental-strip-types --disable-warning=ExperimentalWarning
import { Command } from "commander";
import { setupContext } from "@saflib/commander";
// BEGIN WORKFLOW AREA cli-imports FOR commander/add-command
import { addScanCommand } from "./scan.ts";
import { addShowCommand } from "./show.ts";
import { addDiffCommand } from "./diff.ts";
import { addIssuesCommand } from "./issues.ts";
// END WORKFLOW AREA

const program = new Command()
  .name("saf-dev-site")
  .description(
    "Static-analysis snapshots of a SAF product's git history — scan, show, diff, and list package issues.",
  );

// BEGIN WORKFLOW AREA cli-commands FOR commander/add-command
addScanCommand(program);
addShowCommand(program);
addDiffCommand(program);
addIssuesCommand(program);
// END WORKFLOW AREA

setupContext(
  {
    serviceName: "saf-dev-site",
  },
  () => {
    program.parse(process.argv);
  },
);
