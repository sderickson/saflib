import {
  CopyStepMachine,
  defineWorkflow,
  step,
  UpdateStepMachine,
  PromptStepMachine,
  makeLineReplace,
} from "@saflib/workflows";
import path from "path";

/**
 * Todo:
 * - encourage from the start breaking down the workflow into multiple workflows, which the main workflow orchestrates. Provide guidance on how to scope workflows. Maybe limit to ten routine workflows per complex workflow...
 * - need a way to add a lib function, not just an export
 * - have database schemas be less denormalized generally, and maybe add a step to discuss how to structure the database best for any future plans.
 * - remind agent to use singular table names and query folders.
 * - should probably organize work by feature... don't just build the entire backend and then the entire frontend for a whole series of features.
 */

const sourceDir = path.resolve(import.meta.dirname, "./templates");

const input = [
  {
    name: "name",
    description:
      "kebab-case name of project to use in folder and git branch names and alike",
    exampleValue: "example-project",
  },
] as const;

export interface SpecProjectWorkflowContext {
  targetName: string;
  targetDir: string;
}

export const SpecProjectWorkflowDefinition = defineWorkflow<
  typeof input,
  SpecProjectWorkflowContext
>({
  id: "processes/spec-project",

  description: "Write a product/technical specification for a project.",

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) => {
    const date = new Date().toISOString().split("T")[0];
    const projectDirName = `${date}-${input.name}`;
    const targetDir = path.resolve(input.cwd, "notes", projectDirName);

    return {
      targetName: input.name,
      targetDir,
    };
  },

  templateFiles: {
    spec: path.join(sourceDir, "__target-name__.spec.md"),
    workflow: path.join(sourceDir, "__target-name__.workflow.ts"),
    plan: path.join(sourceDir, "__target-name__.plan.md"),
  },

  docFiles: {},

  versionControl: {
    allowPaths: ({ context }) => [`${context.targetDir}/**`],
  },

  steps: [
    step(CopyStepMachine, ({ context }) => ({
      targetDir: context.targetDir,
      lineReplace: makeLineReplace(context),
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "spec",
      promptMessage: `Update **${path.basename(context.copiedFiles!.spec)}**.`,
    })),

    step(PromptStepMachine, () => ({
      promptText: `Check with the user that the spec is complete and correct.`,
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "workflow",
      promptMessage: `Update **${path.basename(context.copiedFiles!.plan)}**.

      Noe that the project is spec'd, it's time to sketch a plan to implement the spec. The way you'll be doing this is mainly with workflows. Before you write any workflows, though, you should understand what workflows are available, and lay out a plan in the plan.md file.

      You may need to plan for multiple workflows if the spec is larger. It's good to break them down by resource (e.g. database table and related business object) and frontend/backend. So for each resource have one workflow for the frontend and one for the backend, unless it's a small change. It's also generally good to organize workflows in a way that after each one is a good stopping point, where changes can be tested and polished.
      
      To see what workflows there are available, run \`npm exec saf-workflow list -- -a -d\`. If you're not sure where the workflow is in code, you can search for the id or look at /saflib/workflow-cli/list.ts.
      
      The most common workflow... flow is:
      
      Backend:
      * openapi/add-schema - to add business objects
      * openapi/add-route - to add API routes
      * drizzle/update-schema - to add database tables
      * drizzle/add-query - to add database queries
      * express/add-handler - to add API handlers
      
      Frontend:
      * sdk/add-query and sdk/add-mutation - to add TanStack hooks
      * vue/add-page - to add a page
      
      Some have flags, such as "upload" or "file" for variations of adding files to the database, express handlers, api routes, and TanStack mutations. See if you need to use any of these.
      `,
    })),

    step(PromptStepMachine, () => ({
      promptText: `Have the user review the plan and make sure it's good to go.`,
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "workflow",
      promptMessage: `Update **${path.basename(context.copiedFiles!.workflow)}**.

      Now that you have a plan, you can write the workflows per the aligned plan to implement the spec. Only one workflow has been generated, but make as many as the plan dictates.

      For each workflow, run "npm exec saf-workflow dry-run ./path/to/workflow.ts" to make sure everything is wired up correctly. One of the more common errors is for the workflow to not include "CdStepMachine" to move into the right directory before running the workflow. Location matters.
      `,
    })),

    // TODO: figure out how to run dry-run on all workflows the agent generates, not just the template one.
  ],
});
