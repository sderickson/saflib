import {
  CopyStepMachine,
  defineWorkflow,
  step,
  UpdateStepMachine,
  PromptStepMachine,
  makeLineReplace,
  CommandStepMachine,
} from "@saflib/workflows";
import path from "path";

/**
 * Todo:
 * - More thoroughly document what pages and what might share components, or what existing components might be used. Give hints in the prompt.
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
      promptMessage: `Update **${path.basename(context.copiedFiles!.spec)}**.

      When specifying API endpoints, follow the conventions in /saflib/openapi/docs/02-api-design.md — in particular: one URL per distinct action (don't overload endpoints), batch endpoints when child resources need to be fetched for multiple parents, and JSON object responses keyed by resource name.`,
    })),

    step(PromptStepMachine, () => ({
      promptText: `Check with the user that the spec is complete and correct.`,
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "workflow",
      promptMessage: `Update **${path.basename(context.copiedFiles!.plan)}**.

      Note that the project is spec'd, it's time to sketch a plan to implement the spec. The way you'll be doing this is mainly with workflows. Before you write any workflows, though, you should understand what workflows are available, and lay out a plan in the plan.md file.

      You may need to plan for multiple workflows if the spec is larger. It's good to break them down by resource (e.g. database table and related business object) and frontend/backend. So for each resource have one workflow for the frontend and one for the backend, unless it's a small change. It's also generally good to organize workflows in a way that after each one is a good stopping point, where changes can be tested and polished.
      
      To see what workflows there are available, run \`npm exec saf-workflow list -- -a -d\`. If you're not sure where the workflow is in code, you can search for the id or look at /saflib/workflow-cli/list.ts.
      
      The most common workflow... flow is:
      
      Backend:
      * openapi/schema - to add business objects
      * openapi/route - to add API routes (takes path, urlPath, method, and prompt; urlPath uses OpenAPI {param} syntax, method is lowercase e.g. get, post, put, delete)
      * drizzle/update-schema - to add database tables
      * drizzle/add-query - to add database queries
      * express/add-handler - to add API handlers
      
      Frontend:
      * sdk/add-query and sdk/add-mutation - to add TanStack hooks (both take path, urlPath, method, and prompt; urlPath uses OpenAPI {param} syntax, method is lowercase)
      * vue/add-view (not vue/add-page) - to add a page (takes path, urlPath in Vue Router :param style, and prompt)
      
      Some have flags, such as "upload", "download", or "file" for variations of adding file upload/download to the database, express handlers, api routes, and TanStack mutations. See if you need to use any of these.

      As a general rule, have one thing per file. Like with "drizzle/update-schema", have one for each table added to the overall database schema. Don't group routes or handlers or queries or tables in the same file.
      
      **API design**: When planning routes, follow the conventions in /saflib/openapi/docs/02-api-design.md. In particular:
      * Give each distinct action its own URL path — don't overload one endpoint with query params that change its behavior. Use named action paths under the resource (e.g. \`GET /resource-name/by-parent-ids\`, \`GET /resource-name/search\`).
      * When a child resource needs to be fetched for multiple parents on a single page (e.g. note-files for each note), plan a **batch endpoint** (e.g. \`GET /recipe-note-files/by-note-ids?noteIds=...\`) so the frontend can fetch them in one loader query instead of N.
      * URLs ending in a resource ID return JSON. Binary content gets a sub-path like \`/blob\`.
      `,
    })),

    step(PromptStepMachine, () => ({
      promptText: `Have the user review the plan and make sure it's good to go.`,
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "workflow",
      promptMessage: `Update **${path.basename(context.copiedFiles!.workflow)}**.

      Now that you have a plan, you can write the workflows per the aligned plan to implement the spec. Only one workflow has been generated, but make as many as the plan dictates. Have the main one run the others (orchestrating them).

      For each workflow, run "npm exec saf-workflow dry-run ./path/to/workflow.ts" to make sure everything is wired up correctly. One of the more common errors is for the workflow to not include "CdStepMachine" to move into the right directory before running the workflow. Location matters.
      `,
    })),

    step(CommandStepMachine, ({ context }) => ({
      command: "npm",
      args: ["exec", "saf-workflow", "dry-run", context.copiedFiles!.workflow],
    })),

    // TODO: figure out how to run dry-run on all workflows the agent generates, not just the template one.
  ],
});
