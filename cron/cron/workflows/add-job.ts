import {
  CopyStepMachine,
  UpdateStepMachine,
  PromptStepMachine,
  defineWorkflow,
  step,
  parsePath,
  parsePackageName,
  getPackageName,
  makeLineReplace,
  type ParsePathOutput,
  type ParsePackageNameOutput,
  CommandStepMachine,
} from "@saflib/workflows";
import path from "node:path";

const sourceDir = path.join(import.meta.dirname, "./templates");

const input = [
  {
    name: "path",
    description:
      "Path of the new cron job (e.g., 'jobs/notifications/send-reminders')",
    exampleValue: "./jobs/example-group/example-job.ts",
  },
] as const;

interface CronAddJobWorkflowContext
  extends ParsePathOutput,
    ParsePackageNameOutput {}

export const CronAddJobWorkflowDefinition = defineWorkflow<
  typeof input,
  CronAddJobWorkflowContext
>({
  id: "cron/add-job",

  description: "Add a new cron job to the service.",

  checklistDescription: ({ targetName, groupName }) =>
    `Add ${targetName} cron job to ${groupName} group.`,

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) => {
    const pathResult = parsePath(input.path, {
      requiredPrefix: "./jobs/",
      requiredSuffix: ".ts",
      cwd: input.cwd,
    });

    return {
      ...pathResult,
      ...parsePackageName(getPackageName(input.cwd), {
        requiredSuffix: "-cron",
      }),
      targetDir: input.cwd,
    };
  },

  templateFiles: {
    job: path.join(sourceDir, "jobs/__group-name__/__target-name__.ts"),
    test: path.join(sourceDir, "jobs/__group-name__/__target-name__.test.ts"),
    index: path.join(sourceDir, "jobs/__group-name__/index.ts"),
    cron: path.join(sourceDir, "cron.ts"),
  },

  manageVersionControl: true,

  docFiles: {
    overview: path.join(import.meta.dirname, "../docs/overview.md"),
  },

  steps: [
    step(CopyStepMachine, ({ context }) => ({
      name: context.targetName,
      targetDir: context.targetDir,
      lineReplace: makeLineReplace(context),
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "job",
      promptMessage: `Implement the ${context.targetName} cron job handler. Make sure to:
        1. Use the service storage pattern to access database context
        2. Use getSafReporters() for logging
        3. Implement the actual job logic based on the job's purpose
        4. Do not use try/catch! Use the ReturnsError pattern and let unexpected errors propagate up.
        
        Please review documentation here first: ${context.docFiles?.overview}`,
    })),

    step(PromptStepMachine, () => ({
      promptText: `Add the new job to the rest of the package.
      
      * Make sure it's included in the adjacent index.ts file.
      * Make sure those jobs are included in the root cron.ts file.`,
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "test",
      promptMessage: `Update the generated ${context.targetName}.test.ts file to test the cron job functionality.
        
        * Make sure to implement proper test cases that cover the job execution
        * Use the service storage pattern for testing context
        * Test both success and error scenarios
        * Do not do any mocking - use the actual implementations`,
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["run", "typecheck"],
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["run", "test"],
    })),
  ],
});
