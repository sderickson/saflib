import {
  CopyStepMachine,
  UpdateStepMachine,
  PromptStepMachine,
  CommandStepMachine,
  defineWorkflow,
  step,
  CdStepMachine,
  makeLineReplace,
} from "@saflib/workflows";
import path from "node:path";
import { templatesProductRoot } from "@saflib/templates";

const sourceDir = path.join(templatesProductRoot, "packages", "__package-name__");

const input = [
  {
    name: "name",
    description:
      "The desired package name, including scope (e.g., @your-org/package-name)",
    exampleValue: "@example-org/example-package",
  },
  {
    name: "path",
    description:
      "The RELATIVE path from monorepo root where the package directory (containing package.json) will be created (e.g., packages/my-lib or saflib/node)",
    exampleValue: "packages/my-lib",
  },
] as const;

interface AddTsPackageWorkflowContext {
  name: string;
  targetDir: string;
  packageName: string; // e.g. "@your-org/package-name"
  packageDirName: string; // e.g. "package-name"
  path: string; // Relative path from monorepo root
  rootDir: string;
}

export const AddTsPackageWorkflowDefinition = defineWorkflow<
  typeof input,
  AddTsPackageWorkflowContext
>({
  id: "monorepo/add-package",

  description:
    "Creates a new TypeScript package according to monorepo best practices.",

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) => {
    const targetDir = path.join(input.cwd, input.path);
    const packageDirName = path.basename(input.path);

    return {
      name: input.name,
      targetDir,
      packageName: input.name,
      packageDirName,
      path: input.path,
      rootDir: input.cwd,
    };
  },

  templateFiles: {
    packageJson: path.join(sourceDir, "package.json"),
    tsconfig: path.join(sourceDir, "tsconfig.json"),
    starter: path.join(sourceDir, "lib", "starter.ts"),
    starterTest: path.join(sourceDir, "tests", "starter.test.ts"),
    vitest: path.join(sourceDir, "vitest.config.js"),
  },

  docFiles: {},

  steps: [
    step(CopyStepMachine, ({ context }) => {
      const defaultLineReplace = makeLineReplace(context);
      const lineReplace = (line: string) => {
        let newLine = line.replace("template-package", context.packageName);
        return defaultLineReplace(newLine);
      };
      return {
        name: context.packageDirName,
        targetDir: context.targetDir,
        lineReplace,
      };
    }),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "packageJson",
      promptMessage: `The file '${path.join(context.path, "package.json")}' has been created. Please update the "description" field and any other fields as needed, such as dependencies on other SAF libraries.

Keep glob exports (e.g. \`"./lib/*": "./lib/*.ts"\`) — do not add a root \`"."\` barrel. Add more glob keys when you introduce new top-level source folders.`,
    })),

    step(PromptStepMachine, ({ context }) => ({
      promptText: `Ensure the new package path '${context.path}' is included in the "workspaces" array in the root \`package.json\`.
      
      For example: \`"workspaces": ["${context.path}", "other-packages/*"]\`

      Source modules belong under thematic folders (e.g. \`lib/\`), not at the package root.`,
    })),

    step(CdStepMachine, ({ context }) => ({
      path: context.targetDir,
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["install"],
    })),

    step(CdStepMachine, ({ context }) => ({
      path: context.rootDir,
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: [
        "exec",
        "saf-imports",
        "tsconfig",
        "generate",
        "--",
        "--write",
      ],
    })),

    step(CdStepMachine, ({ context }) => ({
      path: context.targetDir,
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["run", "test"],
    })),

    step(CommandStepMachine, ({ context }) => ({
      command: "npm",
      args: [
        "exec",
        "saf-imports",
        "exports",
        "check",
        "--package",
        context.packageName,
      ],
    })),
  ],
});

export default AddTsPackageWorkflowDefinition;
