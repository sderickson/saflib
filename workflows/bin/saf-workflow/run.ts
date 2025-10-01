import type { Command } from "commander";
import { addNewLinesToString } from "../../strings.ts";
import type { WorkflowDefinition, WorkflowArgument } from "../../core/types.ts";
import { runWorkflow } from "./shared/utils.ts";
import { getWorkflowLogger } from "../../core/store.ts";
import { loadWorkflowDefinitionFromFile } from "./shared/file-io.ts";
import { resolve } from "node:path";

export const addRunCommand = (
  program: Command,
  workflows: WorkflowDefinition[],
) => {
  const runProgram = program
    .command("run")
    .description(
      addNewLinesToString(
        "Run a workflow. Like kickoff, but executes prompts with an agent CLI instead of printing them to stdout.",
      ),
    );

  workflows.sort((a, b) => a.id.localeCompare(b.id));

  workflows.forEach((workflow) => {
    let chain = runProgram
      .command(workflow.id)
      .description(workflow.description);
    workflow.input.forEach((arg: WorkflowArgument) => {
      chain = chain.argument(arg.name, arg.description);
    });
    chain.action(async (...args) => {
      await runWorkflow({
        definition: workflow,
        runMode: "run",
        args: args.slice(0, workflow.input.length),
      });
    });
  });

  runProgram
    .description(
      addNewLinesToString(
        "Run a workflow from a file path. That path should export a definition as its default export.",
      ),
    )
    .argument("<path>", "Path to the workflow file")
    .argument("[args...]", "Arguments for the workflow")
    .action(async (filePath: string, args: string[]) => {
      const log = getWorkflowLogger();

      const resolvedPath = resolve(process.cwd(), filePath);
      const workflowDefinition =
        await loadWorkflowDefinitionFromFile(resolvedPath);
      if (!workflowDefinition) {
        process.exit(1);
      }

      log.info(`Workflow sucessfully loaded`);
      log.info(`- Workflow:     ${workflowDefinition.id}`);
      log.info(`- Description:  ${workflowDefinition.description}`);
      if (workflowDefinition.input.length > 0) {
        log.info(
          `- Parameters:   ${workflowDefinition.input.map((arg: any) => arg.name).join(", ")}`,
        );
      }

      // Check if enough arguments were provided
      const expectedArgs = workflowDefinition.input.length;
      const providedArgs = args.length;

      if (providedArgs < expectedArgs) {
        log.error(
          `Error: Expected ${expectedArgs} argument${expectedArgs === 1 ? "" : "s"}, but got ${providedArgs}`,
        );
        process.exit(1);
      }

      if (args.length > 0) {
        log.info(`- Arguments:    ${args.join(", ")}`);
      }

      // Kick off the workflow
      await runWorkflow({
        definition: workflowDefinition,
        runMode: "run",
        args,
      });
    });
};
