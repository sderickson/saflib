import {
  CopyStepMachine,
  UpdateStepMachine,
  PromptStepMachine,
  defineWorkflow,
  step,
  CommandStepMachine,
  makeLineReplace,
} from "@saflib/workflows";
import path from "node:path";
import { readFileSync } from "node:fs";
import { templatesProductRoot } from "@saflib/templates";

const sourceDir = path.join(templatesProductRoot, "packages", "__package-name__");

const input = [
  {
    name: "name",
    description:
      "The name of the export to create (e.g., 'myFunction' or 'MyClass')",
    exampleValue: "myFunction",
  },
  {
    name: "path",
    description:
      "Relative path under the package for the new module (e.g., 'lib/utils' or 'lib/features/billing'). Must not be the package root.",
    exampleValue: "lib",
  },
] as const;

interface AddExportWorkflowContext {
  targetName: string;
  path: string;
  targetDir: string;
  exportPath: string;
  packageName: string;
}

function readPackageName(cwd: string): string {
  const pj = JSON.parse(readFileSync(path.join(cwd, "package.json"), "utf8")) as {
    name: string;
  };
  return pj.name;
}

export const AddExportWorkflowDefinition = defineWorkflow<
  typeof input,
  AddExportWorkflowContext
>({
  id: "monorepo/add-export",

  description: "Add new exports (functions, classes, interfaces) to packages",

  checklistDescription: ({ targetName, path: exportPath }) =>
    `Add ${targetName} export to ${exportPath}.`,

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) => {
    const targetDir = path.join(input.cwd, input.path);
    const exportPath = path.join(targetDir, `${input.name}.ts`);

    return {
      targetName: input.name,
      path: input.path,
      targetDir,
      exportPath,
      packageName: readPackageName(input.cwd),
    };
  },

  templateFiles: {
    export: path.join(sourceDir, "lib", "__target-name__.ts"),
    test: path.join(sourceDir, "lib", "__target-name__.test.ts"),
  },

  versionControl: {
    allowPaths: ["./docs/**"],
  },

  docFiles: {},

  steps: [
    step(PromptStepMachine, ({ context }) => ({
      promptText: `Add export **${context.targetName}** under \`${context.path}/\`.

Rules:
- Do **not** create or update a root \`index.ts\` barrel.
- Put implementation in \`${context.path}/${context.targetName}.ts\` (colocated test: \`${context.path}/${context.targetName}.test.ts\` or under \`tests/\` mirroring the folder).
- If \`${context.path}\` is the package root, stop and re-run with a subfolder (e.g. \`lib\`).`,
    })),

    step(CopyStepMachine, ({ context }) => ({
      targetDir: context.targetDir,
      templateFiles: {
        export: path.join(sourceDir, "lib", "__target-name__.ts"),
        test: path.join(sourceDir, "lib", "__target-name__.test.ts"),
      },
      lineReplace: makeLineReplace(context),
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "export",
      promptMessage: `Update **${path.basename(context.copiedFiles!.export)}** to implement the ${context.targetName} export.`,
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "test",
      promptMessage: `Update **${path.basename(context.copiedFiles!.test)}** to test the ${context.targetName} functionality.`,
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

    step(PromptStepMachine, ({ context }) => ({
      promptText: `If \`exports check\` failed because you added a new top-level source folder, extend \`package.json\` \`exports\` with a glob (e.g. \`"./lib/*": "./lib/*.ts"\`) so every module is covered. Re-run:

\`npm exec saf-imports exports check --package ${context.packageName}\``,
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["exec", "saf-docs", "generate"],
    })),
  ],
});

export default AddExportWorkflowDefinition;
