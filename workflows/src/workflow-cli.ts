import { Command } from "commander";
import type { ChecklistItem, WorkflowMeta } from "@saflib/workflows";
import { loadWorkflow, saveWorkflow } from "./file-io.ts";
import { addNewLinesToString } from "./utils.ts";
import type { SafContext, SafReporters } from "@saflib/node";
import {
  generateRequestId,
  safContextStorage,
  safReportersStorage,
  defaultErrorReporter,
  createLogger,
  setServiceName,
  createSilentLogger,
} from "@saflib/node";
import { format } from "winston";
import { type TransformableInfo } from "logform";
import { XStateWorkflow } from "./workflow.ts";

export function runWorkflowCli(workflows: WorkflowMeta[]) {
  setServiceName("workflows");

  const program = new Command()
    .name("saf-workflow")
    .description(
      addNewLinesToString(
        "Tool for agents to be given a series of prompts. For a list of available workflows, run:\n\nnpm exec saf-workflow help kickoff",
      ),
    );

  const kickoffProgram = program
    .command("kickoff")
    .description(
      addNewLinesToString(
        "Kick off a workflow. Takes a workflow name and then any arguments for the workflow. Names should be kebab-case, and paths should be ./relative/to/package/root.ts. All commands should be run in a folder with a package.json; the package the workflow is acting on. Example:\n\nnpm exec saf-workflow kickoff add-tests ./path/to/file.ts",
      ),
    );
  workflows.forEach(({ Workflow, name, description, cliArguments }) => {
    let chain = kickoffProgram.command(name).description(description);
    cliArguments.forEach((arg) => {
      chain = chain.argument(arg.name, arg.description, arg.defaultValue);
    });
    chain.action(async (...args) => {
      const workflow = new Workflow();
      const result = await workflow.init(
        { dryRun: false },
        ...args.slice(0, cliArguments.length),
      );
      if (result.error) {
        console.error(result.error.message);
        process.exit(1);
      }
      await workflow.kickoff();
      saveWorkflow(workflow);
    });
  });

  program
    .command("status")
    .description(
      addNewLinesToString("Show the status of the current workflow."),
    )
    .action(async () => {
      const workflow = loadWorkflow(workflows);
      if (!workflow) {
        console.log("No workflow found");
        process.exit(1);
      }
      await workflow.printStatus();
    });

  program
    .command("next")
    .description(
      addNewLinesToString(
        "Try to go to the next step of the current workflow.",
      ),
    )
    .action(async () => {
      const workflow = loadWorkflow(workflows);
      if (!workflow) {
        console.log("No workflow found");
        process.exit(1);
      }
      await workflow.goToNextStep();
      saveWorkflow(workflow);
    });

  const checklistProgram = program
    .command("checklist")
    .description(addNewLinesToString("Show the checklist for a workflow."));

  const supportedWorkflows = workflows
    .filter(({ cliArguments }) =>
      cliArguments.every((arg) => arg.exampleValue !== undefined),
    )
    .filter(({ Workflow }) => {
      return new Workflow() instanceof XStateWorkflow;
    });

  const printChecklistRecursively = (
    checklist: ChecklistItem[],
    prefix = "",
  ) => {
    checklist.forEach((item) => {
      console.log(`${prefix}* ${item.description}`);
      if (item.subitems) {
        printChecklistRecursively(item.subitems, `${prefix}  `);
      }
    });
  };

  supportedWorkflows.forEach(
    ({ Workflow, name, description, cliArguments }) => {
      let chain = checklistProgram.command(name).description(description);
      chain.action(async () => {
        const workflow = new Workflow();
        const exampleArgs = cliArguments.map((arg) => arg.exampleValue);
        const result = await workflow.init({ dryRun: true }, ...exampleArgs);
        if (result.error) {
          console.error(result.error.message);
          process.exit(1);
        }
        await workflow.kickoff();
        while (!workflow.done()) {
          await workflow.goToNextStep();
        }

        console.log(`\nChecklist for ${name}:\n`);
        printChecklistRecursively(workflow.getChecklist());
        console.log();
      });
    },
  );

  const reqId = generateRequestId();

  const ctx: SafContext = {
    requestId: reqId,
    serviceName: "workflows",
    operationName: "N/A",
    subsystemName: "cli",
  };

  const dryRun = process.argv.includes("checklist");

  const reporters: SafReporters = {
    log: dryRun
      ? createSilentLogger()
      : createLogger({
          subsystemName: "cli",
          operationName: "workflow-cli",
          format: format.combine(
            format.colorize({ all: true }),
            format.printf((info: TransformableInfo) => {
              const { message } = info;
              return `${message}`;
            }),
          ),
        }),
    logError: defaultErrorReporter,
  };

  safReportersStorage.enterWith(reporters);
  safContextStorage.enterWith(ctx);
  program.parse(process.argv);
}
