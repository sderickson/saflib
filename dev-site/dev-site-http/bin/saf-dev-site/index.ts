#!/usr/bin/env -S node --experimental-strip-types --disable-warning=ExperimentalWarning
import { Command } from "commander";
import { setupContext } from "@saflib/commander";
import { addScanCommand } from "./scan.ts";
import { addShowCommand } from "./show.ts";
import { addDiffCommand } from "./diff.ts";
import { addIssuesCommand } from "./issues.ts";

const program = new Command()
  .name("saf-dev-site")
  .description(
    "Static-analysis snapshots of a SAF product's git history — scan, show, diff, and list package issues.",
  );

setupContext(
  {
    serviceName: "saf-dev-site",
  },
  () => {
    addScanCommand(program);
    addShowCommand(program);
    addDiffCommand(program);
    addIssuesCommand(program);
    program.parse(process.argv);
  },
);
