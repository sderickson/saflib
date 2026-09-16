import path from "node:path";
import { existsSync } from "node:fs";
import {
  defineWorkflow,
  step,
  stepSkipIf,
  parsePath,
  parsePackageName,
  getPackageName,
  makeLineReplace,
  runCopyStep,
  runUpdateStep,
  runPromptStep,
  runCommandStep,
  type CopyStepInput,
  type UpdateStepInput,
  type PromptStepInput,
  type CommandStepInput,
  type ParsePathOutput,
  type ParsePackageNameOutput,
} from "@saflib/new-workflows";
import { templatesProductRoot, templatesSaflibRoot } from "@saflib/templates";

const cronRoot = path.join(templatesProductRoot, "service/cron");
const jobsRoot = path.join(templatesProductRoot, "service/jobs");
const overviewDoc = path.join(templatesSaflibRoot, "cron", "docs", "01-overview.md");

interface CronAddJobInput {
  path: string;
}

interface CronAddJobContext extends ParsePathOutput, ParsePackageNameOutput {
  jobsDir: string;
}

/**
 * Ported from `cron/cron-http/workflows/add-job.ts` — same templates, same
 * prompts, same step order, running on the new sqlite-backed engine
 * instead of XState.
 */
export const CronAddJobWorkflowDefinition = defineWorkflow<
  CronAddJobInput,
  CronAddJobContext
>({
  id: "cron/add-job",

  description: "Add a new cron job to the service.",

  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Path of the new cron job (e.g., './jobs/notifications/send-reminders.ts')",
      },
    },
    required: ["path"],
  },

  context: ({ input, cwd }) => {
    const pathResult = parsePath(input.path, {
      requiredPrefix: "./jobs/",
      requiredSuffix: ".ts",
      cwd,
    });

    // Cron package is service/cron; sibling jobs package holds the trigger map.
    const jobsDir = path.resolve(cwd, "..", "jobs");

    return {
      ...pathResult,
      ...parsePackageName(getPackageName(cwd), {
        requiredSuffix: "-cron",
        silentError: true, // so checklists/dry-runs don't error
      }),
      targetDir: cwd,
      jobsDir,
    };
  },

  steps: [
    step<CopyStepInput, CronAddJobContext>("copy", runCopyStep, ({ context }) => ({
      templateFiles: {
        job: path.join(cronRoot, "jobs/__group-name__/__target-name__.ts"),
        test: path.join(cronRoot, "jobs/__group-name__/__target-name__.test.ts"),
        index: path.join(cronRoot, "jobs/__group-name__/index.ts"),
        cron: path.join(cronRoot, "cron.ts"),
      },
      name: context.targetName,
      targetDir: context.targetDir,
      lineReplace: makeLineReplace(context),
    })),

    // Upsert `cron:{jobName}` → background operation into the jobs trigger map.
    stepSkipIf<CopyStepInput, CronAddJobContext>(
      ({ context }) => !existsSync(path.join(context.jobsDir, "jobs.ts")),
      "copy",
      runCopyStep,
      ({ context }) => ({
        templateFiles: {
          jobs: path.join(jobsRoot, "jobs.ts"),
        },
        name: "cron-trigger-map",
        targetDir: context.jobsDir,
        lineReplace: makeLineReplace(context),
      }),
    ),

    step<UpdateStepInput, CronAddJobContext>("update", runUpdateStep, ({ context }) => ({
      fileId: "job",
      prompt: `Finalize the ${context.targetName} declarative JobConfig. Make sure to:
        1. Set a real cron \`schedule\`
        2. Set \`enqueue.operationId\` to an existing (or newly added) background API operation
        3. Optionally set \`enqueue.request\`, \`enqueue.dedupeKey\` (default \`cron:{jobName}\`), and \`enqueue.priority\`
        4. Do **not** add a \`handler\` — cron only enqueues; work lives in the HTTP operation
        5. Mirror the same operationId in \`service/jobs/jobs.ts\` workflow area \`cron-trigger-map\` (\`cron:${context.targetName}\` → [operationId])
        
        Please review documentation here first: ${overviewDoc}`,
    })),

    step<PromptStepInput, CronAddJobContext>("prompt", runPromptStep, ({ context }) => ({
      prompt: `Add the new job to the rest of the package.
      
      * Make sure it's included in the adjacent index.ts file.
      * Make sure those jobs are included in the root cron.ts file (workflow areas should already upsert imports/map spreads).
      * Ensure \`runCron\` / \`createCronRouter\` receive a required \`enqueueJob\` (e.g. \`makeCronEnqueuer\` from \`@saflib/jobs-http\`).
      * Confirm \`service/jobs/jobs.ts\` has \`cron:${context.targetName}\` pointing at the chosen background operationId (CopyStep should have upserted the edge; update the target if still on the demo stub).`,
    })),

    step<UpdateStepInput, CronAddJobContext>("update", runUpdateStep, ({ context }) => ({
      fileId: "test",
      prompt: `Update the generated ${context.targetName}.test.ts file to assert the declarative JobConfig.
        
        * Assert schedule and enqueue.operationId are set
        * Assert there is no \`handler\` property
        * Keep the test free of mocks — it only checks config shape`,
    })),

    stepSkipIf<UpdateStepInput, CronAddJobContext>(
      ({ context }) => !existsSync(path.join(context.jobsDir, "jobs.ts")),
      "update",
      runUpdateStep,
      ({ context }) => ({
        fileId: "jobs",
        prompt: `Finalize the \`cron:${context.targetName}\` edge in service/jobs/jobs.ts (\`cron-trigger-map\` area). The target must be a background-tagged operationId matching enqueue.operationId.`,
      }),
    ),

    step<CommandStepInput, CronAddJobContext>("command", runCommandStep, () => ({
      command: "npm",
      args: ["run", "typecheck"],
    })),

    step<CommandStepInput, CronAddJobContext>("command", runCommandStep, () => ({
      command: "npm",
      args: ["run", "test"],
    })),
  ],
});

export default CronAddJobWorkflowDefinition;
