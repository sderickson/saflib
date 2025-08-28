/**
 * TODO: Test and update this workflow. Just generated a migration to modern workflow tools but didn't test it. The checklist probably needs to be worked on anyway.
 */

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
  updateTemplateComposer,
  type TemplateWorkflowContext,
} from "@saflib/workflows";
import path from "node:path";
import { fileURLToPath } from "node:url";

interface AddProtoPackageWorkflowInput extends WorkflowInput {
  name: string;
  path: string; // Relative to monorepo root, e.g., "specs" or "libs"
}

interface AddProtoPackageWorkflowContext extends TemplateWorkflowContext {
  packageName: string; // e.g. "@your-org/package-name-rpcs"
  protoPackageName: string; // e.g. "yourorg.packagename.v1"
  path: string; // Relative path from monorepo root
}

export const AddProtoPackageWorkflowMachine = setup({
  types: {
    input: {} as AddProtoPackageWorkflowInput,
    context: {} as AddProtoPackageWorkflowContext,
  },
  actions: workflowActions,
  actors: workflowActors,
}).createMachine({
  id: "add-proto-package",
  description:
    "Creates a new Protocol Buffer package according to monorepo best practices.",
  initial: "copyTemplate",
  context: ({ input }) => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const sourceDir = path.join(__dirname, "templates");
    const targetDir = path.join(process.cwd(), input.path);
    const packageDirName = path.basename(input.path);

    // Transform npm package name to proto package name
    // @saflib/identity-rpcs -> saflib.auth.v1
    const protoPackageName = transformToProtoPackageName(input.name);

    return {
      name: packageDirName,
      pascalName:
        packageDirName.charAt(0).toUpperCase() + packageDirName.slice(1),
      targetDir,
      sourceDir,
      packageName: input.name,
      protoPackageName,
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

    ...updateTemplateComposer<AddProtoPackageWorkflowContext>({
      filePath: (context) => path.join(context.targetDir, "package.json"),
      promptMessage: (context) =>
        `The file '${path.join(context.path, "package.json")}' has been created. Please update the "description" field to describe what this proto package contains, and any other fields as needed.`,
      stateName: "updatePackageJson",
      nextStateName: "updateProtoDefinitions",
    }),

    ...updateTemplateComposer<AddProtoPackageWorkflowContext>({
      filePath: (context) =>
        path.join(context.targetDir, "protos/example.proto"),
      promptMessage: (context) =>
        `An example proto file '${path.join(context.path, "protos/example.proto")}' has been created. Please update it with your actual service definitions, or create additional .proto files as needed. Remember to import "envelope.proto" for SafAuth and SafRequest types.`,
      stateName: "updateProtoDefinitions",
      nextStateName: "updateRootWorkspace",
    }),

    ...promptAgentComposer<AddProtoPackageWorkflowContext>({
      promptForContext: ({ context }) =>
        `Ensure the new package path '${context.path}' is included in the "workspaces" array in the root \`package.json\`.

        For example: \`"workspaces": ["${context.path}", "other-packages/*"]\``,
      stateName: "updateRootWorkspace",
      nextStateName: "runNpmInstall",
    }),

    ...runNpmCommandComposer({
      command: "install",
      stateName: "runNpmInstall",
      nextStateName: "generateTypeScriptCode",
    }),

    ...promptAgentComposer<AddProtoPackageWorkflowContext>({
      promptForContext: ({ context }) =>
        `Run \`npm run generate --workspace="${context.packageName}"\` to generate TypeScript code from the proto definitions. This will create files in the dist/ directory.`,
      stateName: "generateTypeScriptCode",
      nextStateName: "updateIndexTs",
    }),

    ...updateTemplateComposer<AddProtoPackageWorkflowContext>({
      filePath: (context) => path.join(context.targetDir, "index.ts"),
      promptMessage: (context) =>
        `After generation, update '${path.join(context.path, "index.ts")}' to export the generated TypeScript files from the dist/ directory. For example: export * from "./dist/example.ts";`,
      stateName: "updateIndexTs",
      nextStateName: "done",
    }),

    done: {
      type: "final",
    },
  },
  output: outputFromContext,
});

function transformToProtoPackageName(npmPackageName: string): string {
  // Extract scope and package name from @scope/package-name
  const match = npmPackageName.match(/^@([^/]+)\/(.+)$/);
  if (!match) {
    throw new Error(
      `Invalid package name format: ${npmPackageName}. Expected @scope/package-name`,
    );
  }

  const [, scope, packageName] = match;

  // Strip -rpcs suffix if present
  let cleanPackageName = packageName;
  if (cleanPackageName.endsWith("-rpcs")) {
    cleanPackageName = cleanPackageName.slice(0, -5); // Remove "-rpcs"
  }

  // Remove hyphens and replace with underscores (or just remove them)
  cleanPackageName = cleanPackageName.replace(/-/g, "");

  return `${scope}.${cleanPackageName}.v1`;
}

export class AddProtoPackageWorkflow extends XStateWorkflow {
  machine = AddProtoPackageWorkflowMachine;
  description =
    "Creates a new Protocol Buffer package according to monorepo best practices.";
  cliArguments = [
    {
      name: "name",
      description:
        "The desired package name, including scope (e.g., @your-org/package-name-rpcs)",
    },
    {
      name: "path",
      description:
        "The RELATIVE path from monorepo root where the package directory (containing package.json) will be created (e.g., specs/my-rpcs)",
    },
  ];
  sourceUrl = import.meta.url;
}
