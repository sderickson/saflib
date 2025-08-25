import { setup } from "xstate";
import {
  workflowActions,
  workflowActors,
  logInfo,
  promptAgentComposer,
  runNpmCommandComposer,
  XStateWorkflow,
  contextFromInput,
  type WorkflowInput,
  outputFromContext,
  copyTemplateStateComposer,
  updateTemplateFileComposer,
  type TemplateWorkflowContext,
} from "@saflib/workflows";
import path from "node:path";
import { fileURLToPath } from "node:url";

interface AddTsPackageWorkflowInput extends WorkflowInput {
  name: string;
  path: string; // Relative to monorepo root, e.g., "packages" or "libs"
}

interface AddTsPackageWorkflowContext extends TemplateWorkflowContext {
  packageName: string; // e.g. "@your-org/package-name"
  packageDirName: string; // e.g. "package-name"
  path: string; // Relative path from monorepo root
}

export const AddTsPackageWorkflowMachine = setup({
  types: {
    input: {} as AddTsPackageWorkflowInput,
    context: {} as AddTsPackageWorkflowContext,
  },
  actions: workflowActions,
  actors: workflowActors,
}).createMachine({
  id: "add-ts-package",
  description:
    "Creates a new TypeScript package according to monorepo best practices.",
  initial: "copyTemplate",
  context: ({ input }) => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const sourceDir = path.join(__dirname, "templates");
    const targetDir = path.join(process.cwd(), input.path);
    const packageDirName = path.basename(input.path);

    return {
      name: input.name,
      pascalName:
        packageDirName.charAt(0).toUpperCase() + packageDirName.slice(1),
      targetDir,
      sourceDir,
      packageName: input.name,
      packageDirName,
      path: input.path,
      ...contextFromInput(input),
    };
  },
  entry: logInfo("Successfully began workflow"),
  states: {
    ...copyTemplateStateComposer({
      stateName: "copyTemplate",
      nextStateName: "updatePackageJson",
    }),

    ...updateTemplateFileComposer<AddTsPackageWorkflowContext>({
      filePath: (context) => path.join(context.targetDir, "package.json"),
      promptMessage: (context) =>
        `The file '${path.join(context.path, "package.json")}' has been created. Please update the "description" field and any other fields as needed, such as dependencies on other SAF libraries.`,
      stateName: "updatePackageJson",
      nextStateName: "updateRootWorkspace",
    }),

    ...promptAgentComposer<AddTsPackageWorkflowContext>({
      promptForContext: ({ context }) =>
        `Ensure the new package path '${context.path}' is included in the "workspaces" array in the root \`package.json\`.
      
      For example: \`"workspaces": ["${context.path}", "other-packages/*"]\``,
      stateName: "updateRootWorkspace",
      nextStateName: "runNpmInstall",
    }),

    ...runNpmCommandComposer({
      command: "install",
      stateName: "runNpmInstall",
      nextStateName: "verifyTestSetup",
    }),

    ...promptAgentComposer<AddTsPackageWorkflowContext>({
      promptForContext: ({ context }) =>
        `Run the package tests and make sure they pass.
      
      A test file \`${path.join(context.path, `${context.packageDirName}.test.ts`)}\` has been created. Run \`npm run test --workspace="${context.packageName}"\`. You might need to \`cd ${context.path}\` then \`npm run test\`.`,
      stateName: "verifyTestSetup",
      nextStateName: "done",
    }),

    done: {
      type: "final",
    },
  },
  output: outputFromContext,
});

export class AddTsPackageWorkflow extends XStateWorkflow {
  machine = AddTsPackageWorkflowMachine;
  description =
    "Creates a new TypeScript package according to monorepo best practices.";
  cliArguments = [
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
  ];
  sourceUrl = import.meta.url;
}
