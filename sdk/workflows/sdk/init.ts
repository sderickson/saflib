import {
  CopyStepMachine,
  CommandStepMachine,
  CwdStepMachine,
  defineWorkflow,
  step,
} from "@saflib/workflows";
import path from "node:path";

const sourceDir = path.join(import.meta.dirname, "templates");

const input = [
  {
    name: "name",
    description:
      "The name of the SDK package to create (e.g., 'user-sdk' or 'analytics-sdk')",
    exampleValue: "example-sdk",
  },
  {
    name: "path",
    description:
      "The path to the target directory for the SDK package (e.g., './clients/example')",
    exampleValue: "./clients/example",
  },
] as const;

interface SdkInitWorkflowContext {
  name: string;
  targetDir: string;
  packageName: string;
}

export const SdkInitWorkflowDefinition = defineWorkflow<
  typeof input,
  SdkInitWorkflowContext
>({
  id: "sdk/init",

  description:
    "Create a new SDK package following @saflib/sdk structure and conventions",

  checklistDescription: ({ packageName }) =>
    `Create a new ${packageName} SDK package.`,

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) => {
    let name = input.name;
    // make sure name doesn't end with -sdk
    if (input.name.endsWith("-sdk")) {
      name = input.name.slice(0, -4);
    }
    const packageName = name + "-sdk";
    if (name.startsWith("@")) {
      name = name.split("/")[1];
    }
    const targetDir = path.join(input.cwd, input.path);
    return {
      name,
      targetDir,
      packageName,
    };
  },

  templateFiles: {
    index: path.join(sourceDir, "index.ts"),
    fakes: path.join(sourceDir, "fakes.ts"),
    typedFake: path.join(sourceDir, "typed-fake.ts"),
    packageJson: path.join(sourceDir, "package.json"),
    tsconfig: path.join(sourceDir, "tsconfig.json"),
    vitestConfig: path.join(sourceDir, "vitest.config.js"),
    test: path.join(sourceDir, "index.test.ts"),
  },

  docFiles: {
    overview: path.join(import.meta.dirname, "../../docs/01-overview.md"),
  },

  steps: [
    step(CopyStepMachine, ({ context }) => ({
      name: context.name,
      targetDir: context.targetDir,
      lineReplace: (line) =>
        line.replace(
          "@template/file-",
          context.packageName.replace("-sdk", "-"),
        ),
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

export default SdkInitWorkflowDefinition;
