import {
  CopyStepMachine,
  UpdateStepMachine,
  PromptStepMachine,
  defineWorkflow,
  step,
  parsePath,
  parsePackageName,
  getPackageName,
  makeLineReplace,
  type ParsePathOutput,
  type ParsePackageNameOutput,
  CommandStepMachine,
} from "@saflib/workflows";
import { templatesProductRoot } from "@saflib/templates";
import path from "node:path";
import { existsSync } from "node:fs";

const cronRoot = path.join(templatesProductRoot, "service/cron");
const jobsRoot = path.join(templatesProductRoot, "service/jobs");

const input = [
  {
    name: "path",
    description:
      "Path of the new cron job (e.g., 'jobs/notifications/send-reminders')",
    exampleValue: "./jobs/example-group/example-job.ts",
  },
] as const;

interface CronAddJobWorkflowContext
  extends ParsePathOutput,
    ParsePackageNameOutput {
  jobsDir: string;
}

export const CronAddJobWorkflowDefinition = defineWorkflow<
  typeof input,
  CronAddJobWorkflowContext
>({
  id: "cron/add-job",

  description: "Add a new cron job to the service.",

  checklistDescription: ({ targetName, groupName }) =>
    `Add ${targetName} cron job to ${groupName} group.`,

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) => {
    const pathResult = parsePath(input.path, {
      requiredPrefix: "./jobs/",
      requiredSuffix: ".ts",
      cwd: input.cwd,
    });

    // Cron package is service/cron; sibling jobs package holds the trigger map.
    const jobsDir = path.resolve(input.cwd, "..", "jobs");

    return {
      ...pathResult,
      ...parsePackageName(getPackageName(input.cwd), {
        requiredSuffix: "-cron",
        silentError: true, // so checklists don't error
      }),
      targetDir: input.cwd,
      jobsDir,
    };
  },

  templateFiles: {
    job: path.join(cronRoot, "jobs/__group-name__/__target-name__.ts"),
    test: path.join(cronRoot, "jobs/__group-name__/__target-name__.test.ts"),
    index: path.join(cronRoot, "jobs/__group-name__/index.ts"),
    cron: path.join(cronRoot, "cron.ts"),
    jobs: path.join(jobsRoot, "jobs.ts"),
  },

  docFiles: {
    overview: path.join(import.meta.dirname, "../docs/overview.md"),
  },

  steps: [
    step(CopyStepMachine, ({ context }) => ({
      name: context.targetName,
      targetDir: context.targetDir,
      lineReplace: makeLineReplace(context),
    })),

    // Upsert `cron:{jobName}` → background operation into the jobs trigger map.
    step(
      CopyStepMachine,
      ({ context }) => ({
        name: "cron-trigger-map",
        targetDir: context.jobsDir,
        templateFiles: {
          jobs: path.join(jobsRoot, "jobs.ts"),
        },
        lineReplace: makeLineReplace(context),
      }),
      {
        skipIf: ({ context }) =>
          !existsSync(path.join(context.jobsDir, "jobs.ts")),
      },
    ),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "job",
      promptMessage: `Finalize the ${context.targetName} declarative JobConfig. Make sure to:
        1. Set a real cron \`schedule\`
        2. Set \`enqueue.operationId\` to an existing (or newly added) background API operation
        3. Optionally set \`enqueue.request\`, \`enqueue.dedupeKey\` (default \`cron:{jobName}\`), and \`enqueue.priority\`
        4. Do **not** add a \`handler\` — cron only enqueues; work lives in the HTTP operation
        5. Mirror the same operationId in \`service/jobs/jobs.ts\` workflow area \`cron-trigger-map\` (\`cron:${context.targetName}\` → [operationId])
        
        Please review documentation here first: ${context.docFiles?.overview}`,
    })),

    step(PromptStepMachine, ({ context }) => ({
      promptText: `Add the new job to the rest of the package.
      
      * Make sure it's included in the adjacent index.ts file.
      * Make sure those jobs are included in the root cron.ts file (workflow areas should already upsert imports/map spreads).
      * Ensure \`runCron\` / \`createCronRouter\` receive a required \`enqueueJob\` (e.g. \`makeCronEnqueuer\` from \`@saflib/jobs\`).
      * Confirm \`service/jobs/jobs.ts\` has \`cron:${context.targetName}\` pointing at the chosen background operationId (CopyStep should have upserted the edge; update the target if still on the demo stub).`,
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "test",
      promptMessage: `Update the generated ${context.targetName}.test.ts file to assert the declarative JobConfig.
        
        * Assert schedule and enqueue.operationId are set
        * Assert there is no \`handler\` property
        * Keep the test free of mocks — it only checks config shape`,
    })),

    step(
      UpdateStepMachine,
      ({ context }) => ({
        fileId: "jobs",
        promptMessage: `Finalize the \`cron:${context.targetName}\` edge in service/jobs/jobs.ts (\`cron-trigger-map\` area). The target must be a background-tagged operationId matching enqueue.operationId.`,
      }),
      {
        skipIf: ({ context }) =>
          !existsSync(path.join(context.jobsDir, "jobs.ts")),
      },
    ),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["run", "typecheck"],
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["run", "test"],
    })),
  ],
});
