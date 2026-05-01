import {
  CopyStepMachine,
  defineWorkflow,
  step,
  parsePackageName,
  makeLineReplace,
  type ParsePackageNameOutput,
  CommandStepMachine,
  CdStepMachine,
  PromptStepMachine,
} from "@saflib/workflows";
import path from "node:path";

const sourceDir = path.join(import.meta.dirname, "templates");

const input = [
  {
    name: "name",
    description: "Name of the new cron service (e.g., 'my-cron-service')",
    exampleValue: "my-service-cron",
  },
  {
    name: "path",
    description: "Path where the cron service should be created",
    exampleValue: "./services/my-service/my-service-cron",
  },
] as const;

interface CronInitWorkflowContext extends ParsePackageNameOutput {
  targetDir: string;
}

export const CronInitWorkflowDefinition = defineWorkflow<
  typeof input,
  CronInitWorkflowContext
>({
  id: "cron/init",

  description: "Create a new cron service with job scheduling capabilities",

  checklistDescription: ({ packageName }) =>
    `Create a new cron service named '${packageName}' with job scheduling capabilities.`,

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) => {
    return {
      ...parsePackageName(input.name, {
        requiredSuffix: "-cron",
      }),
      targetDir: path.join(input.cwd, input.path),
    };
  },

  templateFiles: {
    cron: path.join(sourceDir, "cron.ts"),
    cronTest: path.join(sourceDir, "cron.test.ts"),
    packageJson: path.join(sourceDir, "package.json"),
    tsconfig: path.join(sourceDir, "tsconfig.json"),
    vitestConfig: path.join(sourceDir, "vitest.config.js"),
  },

  docFiles: {},

  steps: [
    step(CopyStepMachine, ({ context }) => ({
      name: "",
      targetDir: context.targetDir,
      lineReplace: makeLineReplace(context),
    })),

    step(CdStepMachine, ({ context }) => ({
      path: context.targetDir,
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["install"],
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["test"],
    })),

    step(PromptStepMachine, () => ({
      promptText: `Wire this cron package into the rest of the product (paths and package names will differ by repo).

**HTTP API (cron job admin / status endpoints)**  
- In the service's main HTTP app (Express or similar), mount \`createCronRouter\` from \`@saflib/cron\`.
- Pass \`{ jobs }\` from this \`*-cron\` package, and a \`dbKey\` that comes from \`cronDb.connect()\` in \`@saflib/cron-db\` (job settings use the cron schema only). **Do not** pass your main application Drizzle key unless it is the same manager as \`cronDb\`—otherwise \`cronDbManager.get(dbKey)\` is undefined and routes will crash.
- Reuse one shared \`cronDb.connect()\` result for both \`createCronRouter\` and \`runCron\` in the same process.
- Place the router with other API routes, before the global error middleware.

**Admin SPA (optional but typical)**  
- Add \`@saflib/cron-vue\` to the admin client package if missing.
- Register a route that renders \`CronJobsPage\` from \`@saflib/cron-vue\` (often via a thin wrapper component).
- Pass the \`subdomain\` prop the same way other admin API clients do in this repo (often \`"api"\` when the daemon SDK uses \`createSafClient("api")\` so \`/cron/jobs\` hits the same host as the rest of the API).
- Add a sidebar / nav link (e.g. next to other admin pages).

**Process entry (monolith vs standalone service)**  
- Ensure something actually **starts** the cron scheduler: call the package's \`run*Cron(context)\` (or equivalent). Use the same cron \`dbKey\` for \`runCron\` as for \`createCronRouter\`; use the app's AsyncLocalStorage / context only for job handlers that need it, not as the cron settings DB key unless you have wired that intentionally.
- In a **monolith**, that is usually after DB + shared deps are initialized and alongside or before HTTP listen.
- In a **separate cron/worker service**, the service's \`main\` / entrypoint should call \`run*Cron\` instead of (or in addition to) HTTP—adapt to this repo's layout.
- If the app uses \`initializeDependencies()\` or similar for secrets/integrations, ensure it runs before \`run*Cron\` when jobs need those clients.

After changes: add any new workspace dependencies, run typecheck/tests for touched packages.`,
    })),
  ],
});
