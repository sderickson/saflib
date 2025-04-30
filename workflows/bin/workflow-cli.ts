#!/usr/bin/env node --experimental-strip-types --disable-warning=ExperimentalWarning

import { Command } from "commander";
import { workflows } from "../index.ts";
import { loadWorkflow, saveWorkflow } from "./file-io.ts";

const program = new Command();
const kickoffProgram = program.command("kickoff");

workflows.forEach(({ Workflow, name, cliArguments }) => {
  let chain = kickoffProgram.command(name);
  cliArguments.forEach((arg) => {
    chain = chain.argument(arg.name, arg.description, arg.defaultValue);
  });
  chain.action(async (...args) => {
    const workflow = new Workflow();
    const result = await workflow.init(...args);
    if (result.error) {
      console.error(result.error.message);
      process.exit(1);
    }
    await workflow.kickoff();
    saveWorkflow(workflow);
  });
});

program.command("status").action(async () => {
  const workflow = loadWorkflow();
  if (!workflow) {
    console.log("No workflow found");
    process.exit(1);
  }
  await workflow.printStatus();
});

program.command("next").action(async () => {
  const workflow = loadWorkflow();
  if (!workflow) {
    console.log("No workflow found");
    process.exit(1);
  }
  await workflow.goToNextStep();
  saveWorkflow(workflow);
});

program.parse(process.argv);
