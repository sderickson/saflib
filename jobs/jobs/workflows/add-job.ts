import {
  CopyStepMachine,
  UpdateStepMachine,
  PromptStepMachine,
  defineWorkflow,
  step,
  parsePackageName,
  getPackageName,
  makeLineReplace,
  type ParsePackageNameOutput,
  CommandStepMachine,
} from "@saflib/workflows";
import { templatesProductRoot } from "@saflib/templates";
import path from "node:path";

const jobsRoot = path.join(templatesProductRoot, "service/jobs");

const input = [
  {
    name: "callerOperationId",
    description:
      "OpenAPI operationId allowed to enqueue the new background target (trigger-map key)",
    exampleValue: "startJobsDemo",
  },
  {
    name: "targetOperationId",
    description:
      "Background operationId the caller may enqueue (must exist in spec with background tag)",
    exampleValue: "jobsDemoStepB",
  },
  {
    name: "cronJobName",
    description:
      "Optional cron job name when adding a cron: trigger key (omit for HTTP-only edges)",
    exampleValue: "jobsDemoKick",
  },
] as const;

interface JobsAddJobWorkflowContext extends ParsePackageNameOutput {
  callerOperationId: string;
  targetOperationId: string;
  cronJobName?: string;
  jobsDir: string;
}

export const JobsAddJobWorkflowDefinition = defineWorkflow<
  typeof input,
  JobsAddJobWorkflowContext
>({
  id: "jobs/add-job",

  description:
    "Add a trigger-map edge (and optional cron: key) to the product jobs offshoot",

  checklistDescription: ({ callerOperationId, targetOperationId }) =>
    `Add trigger map edge ${callerOperationId} → ${targetOperationId}.`,

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) => {
    const productRoot = path.resolve(input.cwd, "..");
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
      targetDir: jobsDir,
    };
  },

  templateFiles: {
    jobs: path.join(jobsRoot, "jobs.ts"),
  },

  docFiles: {},

  steps: [
    step(CopyStepMachine, ({ context }) => ({
      name: "trigger-map",
      targetDir: context.jobsDir,
      templateFiles: {
        jobs: path.join(jobsRoot, "jobs.ts"),
      },
      lineReplace: makeLineReplace(context),
    })),

    step(PromptStepMachine, ({ context }) => ({
      promptText: `Add trigger-map entries in ${context.packageName}/jobs.ts:
      * HTTP edge in workflow area \`trigger-map\` (jobs/add-job): \`${context.callerOperationId}: ["${context.targetOperationId}"]\`
      ${
        context.cronJobName
          ? `* Prefer \`cron/add-job\` for the \`cron:${context.cronJobName}\` edge (workflow area \`cron-trigger-map\`); or add \`cron:${context.cronJobName}: ["${context.targetOperationId}"]\` here if the cron job already exists`
          : ""
      }
      Implement the background HTTP handler with express/add-handler (background tag).
      Add operationConfig overrides in the same jobs.ts file when needed.`,
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "jobs",
      promptMessage: `Finalize trigger map and operationConfig for ${context.targetOperationId}.`,
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["run", "typecheck"],
      cwd: path.join(templatesProductRoot, "service", "jobs"),
    })),
  ],
});

export default JobsAddJobWorkflowDefinition;
