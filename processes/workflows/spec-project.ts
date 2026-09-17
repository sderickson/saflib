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
  /** Absolute path to the product's threat model, e.g. `{product}/security/threat-model.md`. */
  threatModelPath: string;
  /** Same path relative to the workflow cwd, for prompts and checklists. */
  threatModelDisplayPath: string;
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
    // This workflow is run from `{product}/plans`; the threat model lives in `{product}/security`.
    const threatModelDisplayPath = path.join(
      "..",
      "security",
      "threat-model.md",
    );
    const threatModelPath = path.resolve(input.cwd, threatModelDisplayPath);

    return {
      targetName: input.name,
      targetDir,
      threatModelPath,
      threatModelDisplayPath,
    };
  },

  templateFiles: {
    spec: path.join(sourceDir, "__target-name__.spec.md"),
    workflow: path.join(sourceDir, "__target-name__.workflow.ts"),
    plan: path.join(sourceDir, "__target-name__.plan.md"),
  },

  docFiles: {},

  versionControl: {
    allowPaths: ({ context }) => [
      `${context.targetDir}/**`,
      context.threatModelPath,
    ],
  },

  steps: [
    step(CopyStepMachine, ({ context }) => ({
      targetDir: context.targetDir,
      lineReplace: makeLineReplace(context),
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "spec",
      promptMessage: `Update **${path.basename(context.copiedFiles!.spec)}**.

      When specifying API endpoints, follow the conventions in /saflib/openapi/docs/02-api-design.md — in particular: one URL per distinct action (don't overload endpoints), batch endpoints when child resources need to be fetched for multiple parents, and JSON object responses keyed by resource name (never a bare business object or array at the root).

      **Security Model Updates**: Before filling in this section, read the product's threat model at \`${context.threatModelDisplayPath}\`. Then, for the feature being specified, work through every bullet in the section: new public surface, authorization, data collected/stored/shared, integrations and secrets, file handling, and security tests. Be concrete (name the routes, tags, tables, and services). If the feature genuinely changes none of these, write "None" with a one-sentence justification rather than deleting the section. If the threat model file does not exist, say so in the section and note that one should be created.`,
    })),

    step(PromptStepMachine, () => ({
      promptText: `Check with the user that the spec is complete and correct. Call out the **Security Model Updates** section specifically so the user confirms the security impact before planning begins.`,
    })),

    step(PromptStepMachine, ({ context }) => ({
      promptText: `Apply the **Security Model Updates** section of the spec to the product's threat model at \`${context.threatModelDisplayPath}\`.

      * If the section says "None", skip this step.
      * Otherwise, update the threat model so that it reflects the feature as specified: add new public routes to the public API surface list, add new authz tags or roles to the controls table, add new data flows and integrations, and add any new security specs to the spec map or owner responsibilities. Match the document's existing structure and tone; do not restructure it.
      * If the threat model file does not exist, create a minimal one modeled on /saflib/base/security/threat-model.md and tell the user.

      The goal is that the threat model is updated *before* implementation starts, so the plan and workflows that follow can reference it.`,
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "workflow",
      promptMessage: `Update **${path.basename(context.copiedFiles!.plan)}**.

      Note that the project is spec'd, it's time to sketch a plan to implement the spec. The way you'll be doing this is mainly with workflows. Before you write any workflows, though, you should understand what workflows are available, and lay out a plan in the plan.md file.

      If the spec's **Security Model Updates** section is not "None", the plan must include the work it implies: authz tags on new routes, mock clients for new integrations, and a phase (or step within a phase) that adds the security specs listed there. Don't leave security work for after the feature is "done".

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
      * **Response envelopes:** every JSON success body is a flat object keyed by resource name (\`{ recipe: ... }\`, \`{ recipes: [...] }\`). Never put a business object or array at the document root — that makes adding a second resource or metadata a breaking change. Keep resources flat (IDs, not nested objects).
      `,
    })),

    step(PromptStepMachine, () => ({
      promptText: `Have the user review the plan and make sure it's good to go.`,
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "workflow",
      promptMessage: `Update **${path.basename(context.copiedFiles!.workflow)}**.

      Now that you have a plan, write the workflows per the aligned plan to implement the spec. The generated file is the **orchestrator**; add as many phase workflows as the plan dictates and have the orchestrator invoke each with \`makeWorkflowMachine\`.

      **Break down into phase workflows** (see e.g. \`product/plans/notes/<project>/\` in your repo):
      * One file per plan phase: \`phase-1-<kebab-name>.workflow.ts\`, \`phase-2-...\`, etc.
      * Each phase workflow gets its own \`id\` (\`plans/<project>/phase-N-<name>\`), \`docFiles\` pointing at the project's spec + plan, and phase-scoped \`versionControl.allowPaths\`.
      * The orchestrator (\`<name>.workflow.ts\`) imports every phase and runs them in order; keep \`GetFeedbackStep\` only on the orchestrator.
      * **Phase workflows are run standalone** (one phase per fresh agent). No dedicated orientation \`PromptStepMachine\` — prepend \`phaseOrient()\` (or equivalent) to the **first step that has a prompt** (\`PromptStepMachine\` or a sub-workflow \`prompt\` field). If the workflow opens with \`CdStepMachine\` or a prompt-less sub-workflow, put orientation on the next prompt-bearing step. Later steps use a shorter \`Use workflow docFiles (...)\` line.
      * Extract shared \`docFiles\` / orientation helpers into a sibling \`<name>.shared.ts\` when multiple phase files repeat the same paths (see \`jobs-m2.shared.ts\`).

      For each workflow, run \`npm exec saf-workflow dry-run ./path/to/workflow.ts\` to make sure everything is wired up. A common error is omitting \`CdStepMachine\` to cd into the right package before a sub-workflow — location matters.
      `,
    })),

    step(CommandStepMachine, ({ context }) => ({
      command: "npm",
      args: ["exec", "saf-workflow", "dry-run", context.copiedFiles!.workflow],
    })),

    // TODO: figure out how to run dry-run on all workflows the agent generates, not just the template one.
  ],
});
