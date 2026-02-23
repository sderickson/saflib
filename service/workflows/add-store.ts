import {
  CopyStepMachine,
  PromptStepMachine,
  CommandStepMachine,
  defineWorkflow,
  step,
  parsePackageName,
  getPackageName,
  makeLineReplace,
  type ParsePackageNameOutput,
} from "@saflib/workflows";
import path from "node:path";

const sourceDir = path.join(import.meta.dirname, "common-templates");

const input = [
  {
    name: "name",
    description:
      "camelCase property name for the store (e.g. 'recipesFileContainer')",
    exampleValue: "recipesFileContainer",
  },
] as const;

interface ServiceAddStoreWorkflowContext extends ParsePackageNameOutput {
  storeName: string;
  targetDir: string;
}

export const ServiceAddStoreWorkflowDefinition = defineWorkflow<
  typeof input,
  ServiceAddStoreWorkflowContext
>({
  id: "service/add-store",

  description:
    "Add an ObjectStore property to a service-common package's context.",

  checklistDescription: ({ storeName, packageName }) =>
    `Add \`${storeName}\` ObjectStore to ${packageName}.`,

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) => {
    return {
      ...parsePackageName(getPackageName(input.cwd), {
        silentError: true,
        requiredSuffix: "-service-common",
      }),
      storeName: input.name,
      targetDir: input.cwd,
    };
  },

  templateFiles: {
    context: path.join(sourceDir, "context.ts"),
  },

  docFiles: {},

  versionControl: {
    allowPaths: ["**/package.json"],
  },

  steps: [
    step(CopyStepMachine, ({ context }) => ({
      name: context.storeName,
      targetDir: context.targetDir,
      lineReplace: makeLineReplace({ storeName: context.storeName }),
    })),

    step(PromptStepMachine, ({ context }) => ({
      prompt: `Ensure @saflib/object-store is a dependency of this package (${context.packageName}).

- Check package.json for "@saflib/object-store" in dependencies.
- If missing, add it and run \`npm install\`.
- Then update the service's http.ts (in the adjacent http package) to use \`makeContext\` from this package instead of creating the context object inline, so the new store is properly initialized.`,
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["run", "test"],
    })),
  ],
});

export default ServiceAddStoreWorkflowDefinition;
