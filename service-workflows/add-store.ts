import path from "node:path";
import {
  defineWorkflow,
  step,
  parsePackageName,
  getPackageName,
  makeLineReplace,
  runCopyStep,
  runCommandStep,
  runUpdateStep,
  runPromptStep,
  type CopyStepInput,
  type CommandStepInput,
  type UpdateStepInput,
  type PromptStepInput,
  type ParsePackageNameOutput,
} from "@saflib/new-workflows";
import { templatesProductRoot } from "@saflib/templates";

const contextTemplate = path.join(templatesProductRoot, "service", "common", "context.ts");

interface ServiceAddStoreInput {
  /** camelCase property name for the store (e.g. 'recipesFileContainer'). */
  name: string;
}

interface ServiceAddStoreWorkflowContext extends ParsePackageNameOutput {
  storeName: string;
  targetDir: string;
}

/**
 * Ported from `service/workflows/add-store.ts` — same templates, same
 * prompts, same step order, running on the new sqlite-backed engine
 * instead of XState.
 *
 * The old `context()` special-cased `input.runMode === "checklist"` to
 * append `-common` to `cwd` for checklist-only example generation — the
 * new engine's `context()` doesn't receive a `mode`/`runMode` at all
 * (only `{input, cwd}`), so that branch has no equivalent here and was
 * dropped; the `cwd` must already end with `common` for a real run.
 */
export const ServiceAddStoreWorkflowDefinition = defineWorkflow<
  ServiceAddStoreInput,
  ServiceAddStoreWorkflowContext
>({
  id: "service/add-store",

  description: "Add an ObjectStore property to a service-common package's context.",

  inputSchema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "camelCase property name for the store (e.g. 'recipesFileContainer')",
      },
    },
    required: ["name"],
  },

  context: ({ input, cwd }) => {
    if (!cwd.endsWith("common")) {
      throw new Error("CWD must end with common");
    }
    return {
      ...parsePackageName(getPackageName(cwd), {
        silentError: true,
        requiredSuffix: "-service-common",
      }),
      storeName: input.name,
      targetDir: cwd,
    };
  },

  steps: [
    step<CopyStepInput, ServiceAddStoreWorkflowContext>("copy", runCopyStep, ({ context }) => ({
      templateFiles: {
        context: contextTemplate,
      },
      name: context.storeName,
      targetDir: context.targetDir,
      lineReplace: makeLineReplace(context),
    })),

    step<CommandStepInput, ServiceAddStoreWorkflowContext>("command", runCommandStep, () => ({
      command: "npm",
      args: ["install", "@saflib/object-store"],
    })),

    step<UpdateStepInput, ServiceAddStoreWorkflowContext>("update", runUpdateStep, () => ({
      fileId: "context",
      prompt: `Update the copied \`context.ts\` file to set up the desired file store. Right now it's a test store.`,
    })),

    step<PromptStepInput, ServiceAddStoreWorkflowContext>("prompt", runPromptStep, () => ({
      prompt: `Update the service's http.ts (in the adjacent http package) to use \`makeContext\` from this package instead of creating the context object inline, so the new store is properly initialized.`,
    })),

    step<CommandStepInput, ServiceAddStoreWorkflowContext>("command", runCommandStep, () => ({
      command: "npm",
      args: ["run", "test"],
    })),
  ],
});

export default ServiceAddStoreWorkflowDefinition;
