import {
  CopyStepMachine,
  CommandStepMachine,
  CwdStepMachine,
  defineWorkflow,
  step,
  type ParsePackageNameOutput,
  parsePackageName,
  makeLineReplace,
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

interface SdkInitWorkflowContext extends ParsePackageNameOutput {
  targetDir: string;
  // name: string;
  // targetDir: string;
  // packageName: string;
}

export const SdkInitWorkflowDefinition = defineWorkflow<
  typeof input,
  SdkInitWorkflowContext
>({
  id: "sdk/init",

  description: "Create an Tanstack/Vue SDK package",

  checklistDescription: ({ packageName }) =>
    `Create the ${packageName} Tanstack/Vue SDK package.`,

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) => {
    return {
      ...parsePackageName(input.name, {
        requiredSuffix: "-sdk",
      }),
      targetDir: path.join(input.cwd, input.path),
    };
  },

  templateFiles: {
    client: path.join(sourceDir, "client.ts"),
    fakes: path.join(sourceDir, "fakes.ts"),
    i18n: path.join(sourceDir, "i18n.ts"),
    test: path.join(sourceDir, "index.test.ts"),
    index: path.join(sourceDir, "index.ts"),
    packageJson: path.join(sourceDir, "package.json"),
    strings: path.join(sourceDir, "strings.ts"),
    testApp: path.join(sourceDir, "test-app.ts"),
    tsconfig: path.join(sourceDir, "tsconfig.json"),
    typedFake: path.join(sourceDir, "typed-fake.ts"),
    vitestConfig: path.join(sourceDir, "vitest.config.js"),
    components: path.join(sourceDir, "components.ts"),
  },

  docFiles: {
    overview: path.join(import.meta.dirname, "../docs/01-overview.md"),
  },

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

export default SdkInitWorkflowDefinition;
