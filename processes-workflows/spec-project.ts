import path from "node:path";
import {
  defineWorkflow,
  step,
  makeLineReplace,
  runCopyStep,
  runUpdateStep,
  runPromptStep,
  runCommandStep,
  type CopyStepInput,
  type UpdateStepInput,
  type PromptStepInput,
  type CommandStepInput,
} from "@saflib/new-workflows";
import { templatesSaflibRoot } from "@saflib/templates";

const sourceDir = path.join(templatesSaflibRoot, "processes", "workflows", "templates");

interface SpecProjectInput {
  /** kebab-case name of project to use in folder and git branch names and alike. */
  name: string;
}

interface SpecProjectWorkflowContext {
  targetName: string;
  targetDir: string;
}

/**
 * Ported from `processes/workflows/spec-project.ts` — same templates, same
 * prompts, same step order, running on the new sqlite-backed engine
 * instead of XState.
 *
 * The generated `.workflow.ts` template (and its prompt text below) still
 * describes the *old* XState engine's conventions (`makeWorkflowMachine`,
 * `GetFeedbackStep`, `saf-workflow dry-run`) — same as the old file, and
 * out of scope for this port to rewrite; `workflows/add-workflow` (the
 * tool that scaffolds new workflow files) is itself deferred pending a
 * rebuild, so this content will need revisiting alongside that.
 */
export const SpecProjectWorkflowDefinition = defineWorkflow<
  SpecProjectInput,
  SpecProjectWorkflowContext
>({
  id: "processes/spec-project",

  description: "Write a product/technical specification for a project.",

  inputSchema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description:
          "kebab-case name of project to use in folder and git branch names and alike",
      },
    },
    required: ["name"],
  },

  context: ({ input, cwd }) => {
    const date = new Date().toISOString().split("T")[0];
    const projectDirName = `${date}-${input.name}`;
    const targetDir = path.resolve(cwd, "notes", projectDirName);

    return {
      targetName: input.name,
      targetDir,
    };
  },

  steps: [
    step<CopyStepInput, SpecProjectWorkflowContext>("copy", runCopyStep, ({ context }) => ({
      templateFiles: {
        spec: path.join(sourceDir, "__target-name__.spec.md"),
        workflow: path.join(sourceDir, "__target-name__.workflow.ts"),
        plan: path.join(sourceDir, "__target-name__.plan.md"),
      },
      targetDir: context.targetDir,
      lineReplace: makeLineReplace(context),
    })),

    step<UpdateStepInput, SpecProjectWorkflowContext>("update", runUpdateStep, ({ context }) => ({
      fileId: "spec",
      prompt: `Update **${context.targetName}.spec.md**.

      When specifying API endpoints, follow the conventions in /saflib/openapi/docs/02-api-design.md — in particular: one URL per distinct action (don't overload endpoints), batch endpoints when child resources need to be fetched for multiple parents, and JSON object responses keyed by resource name (never a bare business object or array at the root).`,
    })),

    step<PromptStepInput, SpecProjectWorkflowContext>("prompt", runPromptStep, () => ({
      prompt: `Check with the user that the spec is complete and correct.`,
    })),

    step<UpdateStepInput, SpecProjectWorkflowContext>("update", runUpdateStep, ({ context }) => ({
      fileId: "workflow",
      prompt: `Update **${context.targetName}.plan.md**.

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
      * **Response envelopes:** every JSON success body is a flat object keyed by resource name (\`{ recipe: ... }\`, \`{ recipes: [...] }\`). Never put a business object or array at the document root — that makes adding a second resource or metadata a breaking change. Keep resources flat (IDs, not nested objects).
      `,
    })),

    step<PromptStepInput, SpecProjectWorkflowContext>("prompt", runPromptStep, () => ({
      prompt: `Have the user review the plan and make sure it's good to go.`,
    })),

    step<UpdateStepInput, SpecProjectWorkflowContext>("update", runUpdateStep, ({ context }) => ({
      fileId: "workflow",
      prompt: `Update **${context.targetName}.workflow.ts**.

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

    step<CommandStepInput, SpecProjectWorkflowContext>("command", runCommandStep, ({ context }) => ({
      command: "npm",
      args: ["exec", "saf-workflow", "dry-run", path.join(context.targetDir, `${context.targetName}.workflow.ts`)],
    })),

    // TODO: figure out how to run dry-run on all workflows the agent generates, not just the template one.
  ],
});

export default SpecProjectWorkflowDefinition;
