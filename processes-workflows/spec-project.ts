import path from "node:path";
import { existsSync } from "node:fs";
import {
  defineWorkflow,
  step,
  makeLineReplace,
  runCopyStep,
  runUpdateStep,
  runPromptStep,
  type CopyStepInput,
  type UpdateStepInput,
  type PromptStepInput,
} from "@saflib/new-workflows";
import { templatesSaflibRoot } from "@saflib/templates";

const sourceDir = path.join(templatesSaflibRoot, "processes", "workflows", "templates");
const phaseWorkflowDocs = path.join(
  templatesSaflibRoot,
  "processes-workflows",
  "docs",
  "phase-workflows.md",
);

interface SpecProjectInput {
  /** kebab-case name of project to use in folder and file names. */
  name: string;
  /** What the project should do. Passed to the agent writing the spec. */
  prompt?: string;
}

interface SpecProjectWorkflowContext {
  targetName: string;
  targetDir: string;
  prompt: string;
}

const SPEC_PAUSE_MESSAGE =
  "Spec is written. Review it in the plan folder, then continue to generate phase workflows.";

/**
 * Writes a product spec, pauses for review, then asks the agent to add
 * phase workflow YAML files in the same folder. Does not write a plan.md
 * or a project-named orchestrator — those sorted after the phases and
 * Play current plan would run them again.
 */
export const SpecProjectWorkflowDefinition = defineWorkflow<
  SpecProjectInput,
  SpecProjectWorkflowContext
>({
  id: "processes/spec-project",

  description: "Write a product/technical specification for a project, then phase workflows.",

  inputSchema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description:
          "kebab-case name of project to use in folder and file names",
      },
      prompt: {
        type: "string",
        description: "What the project should do. The agent uses this while writing the spec.",
      },
    },
    required: ["name"],
  },

  context: ({ input, cwd }) => {
    // phase-0-plan cds into the dated project folder before calling this.
    // A direct CLI run from a package still gets notes/<date>-<name>/.
    const launchedInPlace = existsSync(path.join(cwd, "phase-0-plan.workflow.yaml"));
    const date = new Date().toISOString().split("T")[0];
    const targetDir = launchedInPlace
      ? cwd
      : path.resolve(cwd, "notes", `${date}-${input.name}`);

    return {
      targetName: input.name,
      targetDir,
      prompt: input.prompt?.trim() ?? "",
    };
  },

  steps: [
    step<CopyStepInput, SpecProjectWorkflowContext>("copy", runCopyStep, ({ context }) => ({
      templateFiles: {
        spec: path.join(sourceDir, "__target-name__.spec.md"),
      },
      targetDir: context.targetDir,
      lineReplace: makeLineReplace(context),
    })),

    step<UpdateStepInput, SpecProjectWorkflowContext>(
      "update",
      runUpdateStep,
      ({ context }) => ({
        fileId: "spec",
        prompt: `${context.prompt ? `Project brief:\n${context.prompt}\n\n` : ""}Update **${context.targetName}.spec.md** so it specifies this project.

When specifying API endpoints, follow the conventions in /saflib/openapi/docs/02-api-design.md — in particular: one URL per distinct action (don't overload endpoints), batch endpoints when child resources need to be fetched for multiple parents, and JSON object responses keyed by resource name (never a bare business object or array at the root).

Do not write phase workflow files in this step.`,
      }),
      { pauseAfter: true, pauseMessage: SPEC_PAUSE_MESSAGE },
    ),

    step<PromptStepInput, SpecProjectWorkflowContext>("prompt", runPromptStep, ({ context }) => ({
      prompt: `The spec in this folder is reviewed and approved. Write phase workflow YAML files next to it that implement **${context.targetName}.spec.md**.

Read ${phaseWorkflowDocs} and follow it. Write phase-1-….workflow.yaml, phase-2-….workflow.yaml, and so on. Do not write a plan.md. Do not write an orchestrator named after the project. Do not modify phase-0-plan.workflow.yaml.

Each phase is a stopping point (typecheck and tests). One schema, route, query, handler, or view per call-workflow. cd into the target package before those calls.`,
    })),
  ],
});

export default SpecProjectWorkflowDefinition;
