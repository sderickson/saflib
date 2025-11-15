import {
  CopyStepMachine,
  defineWorkflow,
  step,
  parsePackageName,
  makeLineReplace,
  type ParsePackageNameOutput,
  CommandStepMachine,
  CwdStepMachine,
} from "@saflib/workflows";
import path from "node:path";

const sourceDir = path.join(import.meta.dirname, "templates");

const input = [
  {
    name: "name",
    description: "Name of the new cron service (e.g., 'my-cron-service')",
    exampleValue: "my-service-cron",
  },
  {
    name: "path",
    description: "Path where the cron service should be created",
    exampleValue: "./services/my-service/my-service-cron",
  },
] as const;

interface CronInitWorkflowContext extends ParsePackageNameOutput {
  targetDir: string;
}

export const CronInitWorkflowDefinition = defineWorkflow<
  typeof input,
  CronInitWorkflowContext
>({
  id: "cron/init",

  description: "Create a new cron service with job scheduling capabilities",

  checklistDescription: ({ packageName }) =>
    `Create a new cron service named '${packageName}' with job scheduling capabilities.`,

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) => {
    return {
      ...parsePackageName(input.name, {
        requiredSuffix: "-cron",
      }),
      targetDir: path.join(input.cwd, input.path),
    };
  },

  templateFiles: {
    cron: path.join(sourceDir, "cron.ts"),
    cronTest: path.join(sourceDir, "cron.test.ts"),
    packageJson: path.join(sourceDir, "package.json"),
    tsconfig: path.join(sourceDir, "tsconfig.json"),
    vitestConfig: path.join(sourceDir, "vitest.config.js"),
  },

  docFiles: {},

  steps: [
    step(CopyStepMachine, ({ context }) => ({
      name: "",
      targetDir: context.targetDir,
      lineReplace: makeLineReplace(context),
    })),

    step(CwdStepMachine, ({ context }) => ({
      path: context.targetDir,
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["install"],
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["test"],
    })),
  ],
});
