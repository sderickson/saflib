import path from "node:path";
import {
  defineWorkflow,
  step,
  parsePackageName,
  getPackageName,
  makeLineReplace,
  runCopyStep,
  runUpdateStep,
  runPromptStep,
  runCommandStep,
  runCdStep,
  type CopyStepInput,
  type UpdateStepInput,
  type PromptStepInput,
  type CommandStepInput,
  type CdStepInput,
  type ParsePackageNameOutput,
} from "@saflib/new-workflows";
import { templatesProductRoot } from "@saflib/templates";

const jobsRoot = path.join(templatesProductRoot, "service/jobs");

interface JobsAddJobInput {
  callerOperationId: string;
  targetOperationId: string;
  cronJobName?: string;
}

interface JobsAddJobContext extends ParsePackageNameOutput {
  callerOperationId: string;
  targetOperationId: string;
  cronJobName?: string;
  jobsDir: string;
}

/**
 * Ported from `jobs/jobs-http/workflows/add-job.ts` — same templates, same
 * prompts, same step order, running on the new sqlite-backed engine
 * instead of XState. The old final `CommandStepMachine` ran with an
 * explicit `cwd:` override (`CommandStepInput` has no such field) — ported
 * as a `cd` step to `jobsDir` right before it instead.
 */
export const JobsAddJobWorkflowDefinition = defineWorkflow<
  JobsAddJobInput,
  JobsAddJobContext
>({
  id: "jobs/add-job",

  description: "Add a trigger-map edge (and optional cron: key) to the product jobs offshoot",

  inputSchema: {
    type: "object",
    properties: {
      callerOperationId: {
        type: "string",
        description: "OpenAPI operation_id allowed to enqueue the new background target (trigger-map key)",
      },
      targetOperationId: {
        type: "string",
        description: "Background operation_id the caller may enqueue (must exist in spec with background tag)",
      },
      cronJobName: {
        type: "string",
        description: "Optional cron job name when adding a cron: trigger key (omit for HTTP-only edges)",
      },
    },
    required: ["callerOperationId", "targetOperationId"],
  },

  context: ({ input, cwd }) => {
    const productRoot = path.resolve(cwd, "..");
    const jobsDir = path.join(productRoot, "service", "jobs");

    let packageName = "@saflib/base-jobs";
    try {
      packageName = getPackageName(jobsDir);
    } catch {
      // golden product default
    }

    return {
      ...parsePackageName(packageName, {
        requiredSuffix: "-jobs",
        silentError: true,
      }),
      callerOperationId: input.callerOperationId,
      targetOperationId: input.targetOperationId,
      cronJobName: input.cronJobName,
      jobsDir,
    };
  },

  steps: [
    step<CopyStepInput, JobsAddJobContext>("copy", runCopyStep, ({ context }) => ({
      templateFiles: {
        jobs: path.join(jobsRoot, "jobs.ts"),
      },
      name: "trigger-map",
      targetDir: context.jobsDir,
      lineReplace: makeLineReplace(context),
    })),

    step<PromptStepInput, JobsAddJobContext>("prompt", runPromptStep, ({ context }) => ({
      prompt: `Add trigger-map entries in ${context.packageName}/jobs.ts:
      * HTTP edge in workflow area \`trigger-map\` (jobs/add-job): \`${context.callerOperationId}: ["${context.targetOperationId}"]\`
      ${
        context.cronJobName
          ? `* Prefer \`cron/add-job\` for the \`cron:${context.cronJobName}\` edge (workflow area \`cron-trigger-map\`); or add \`cron:${context.cronJobName}: ["${context.targetOperationId}"]\` here if the cron job already exists`
          : ""
      }
      Implement the background HTTP handler with express/add-handler (background tag).
      Add operationConfig overrides in the same jobs.ts file when needed.`,
    })),

    step<UpdateStepInput, JobsAddJobContext>("update", runUpdateStep, ({ context }) => ({
      fileId: "jobs",
      prompt: `Finalize trigger map and operationConfig for ${context.targetOperationId}.`,
    })),

    step<CdStepInput, JobsAddJobContext>("cd", runCdStep, ({ context }) => ({
      path: context.jobsDir,
    })),

    step<CommandStepInput, JobsAddJobContext>("command", runCommandStep, () => ({
      command: "npm",
      args: ["run", "typecheck"],
    })),
  ],
});

export default JobsAddJobWorkflowDefinition;
