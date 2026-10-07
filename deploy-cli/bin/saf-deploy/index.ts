#!/usr/bin/env -S node --experimental-strip-types --disable-warning=ExperimentalWarning
import { Command } from "commander";
import { setupContext } from "@saflib/commander";
// BEGIN WORKFLOW AREA cli-imports FOR commander/add-command
import { addBuildCommand } from "./build.ts";
import { addPushCommand } from "./push.ts";
import { addStatusCommand } from "./status.ts";
import { addSyncCommand } from "./sync.ts";
import { addSetupCommand } from "./setup.ts";
import { addPullCommand } from "./pull.ts";
import { addUpCommand } from "./up.ts";
import { addDownCommand } from "./down.ts";
import { addLogsCommand } from "./logs.ts";
import { addPurgeCommand } from "./purge.ts";
import { addExecCommand } from "./exec.ts";
import { addReleaseCommand } from "./release.ts";
// END WORKFLOW AREA

const program = new Command()
  .name("saf-deploy")
  .description(
    "Build, push and deploy a SAF product's production stack. Run from the deploy package (env.remote + remote-assets/).",
  );

// BEGIN WORKFLOW AREA cli-commands FOR commander/add-command
addBuildCommand(program);
addPushCommand(program);
addStatusCommand(program);
addSyncCommand(program);
addSetupCommand(program);
addPullCommand(program);
addUpCommand(program);
addDownCommand(program);
addLogsCommand(program);
addPurgeCommand(program);
addExecCommand(program);
addReleaseCommand(program);
// END WORKFLOW AREA

setupContext({ serviceName: "saf-deploy" }, () => {
  program.parseAsync(process.argv).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
});
