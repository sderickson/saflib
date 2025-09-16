import {
  CopyStepMachine,
  defineWorkflow,
  step,
  CwdStepMachine,
  CommandStepMachine,
} from "@saflib/workflows";
import path from "node:path";
import { getCurrentPackageName } from "@saflib/dev-tools";

const sourceDir = path.join(import.meta.dirname, "common-templates");

const input = [
  {
    name: "path",
    description:
      "The path to the target directory which houses all service packages.",
    exampleValue: "./services/example-service",
  },
] as const;

interface InitCommonWorkflowContext {
  serviceName: string;
  targetDir: string;
  packageName: string;
  orgString: string;
}

export const InitCommonWorkflowDefinition = defineWorkflow<
  typeof input,
  InitCommonWorkflowContext
>({
  id: "service/init-common",

  description: "Create a shared service package",

  checklistDescription: ({ packageName }) =>
    `Create the ${packageName} shared service package.`,

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) => {
    const serviceName = path.basename(input.path);
    const targetDir = path.join(
      input.cwd,
      input.path,
      `${serviceName}-service-common`,
    );
    const currentPackageName = getCurrentPackageName();
    let orgString = "";
    if (
      currentPackageName.startsWith("@") &&
      currentPackageName.includes("/")
    ) {
      orgString = currentPackageName.split("/")[0] + "/";
    }
    const packageName = `${orgString}${serviceName}-service-common`;

    return {
      serviceName,
      targetDir,
      packageName,
      orgString,
    };
  },

  templateFiles: {
    context: path.join(sourceDir, "context.ts"),
    envSchema: path.join(sourceDir, "env.schema.json"),
    index: path.join(sourceDir, "index.ts"),
    packageJson: path.join(sourceDir, "package.json"),
    tsconfig: path.join(sourceDir, "tsconfig.json"),
    vitestConfig: path.join(sourceDir, "vitest.config.js"),
    test: path.join(sourceDir, "index.test.ts"),
  },

  docFiles: {},

  steps: [
    step(CopyStepMachine, ({ context }) => ({
      name: context.serviceName,
      targetDir: context.targetDir,
      lineReplace: (line) =>
        line.replace("@template/file", context.packageName.replace("-service-common", "")),
    })),

    step(CwdStepMachine, ({ context }) => ({
      path: context.targetDir,
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["exec", "saf-env", "generate"],
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
