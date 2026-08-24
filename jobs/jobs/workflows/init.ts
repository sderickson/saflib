import {
  CopyStepMachine,
  defineWorkflow,
  step,
  parsePackageName,
  makeLineReplace,
  type ParsePackageNameOutput,
  CommandStepMachine,
  CdStepMachine,
  getPackageName,
  PromptStepMachine,
} from "@saflib/workflows";
import { kebabCaseToPascalCase, kebabCaseToCamelCase } from "@saflib/utils";
import { templatesProductRoot } from "@saflib/templates";
import path from "node:path";
import { existsSync } from "node:fs";

const jobsRoot = path.join(templatesProductRoot, "service/jobs");

const input = [
  {
    name: "parent",
    description:
      "Optional path to the product root (default: cwd). Ensures service/jobs exists and weaves jobs into http + monolith.",
    exampleValue: ".",
  },
] as const;

interface JobsInitWorkflowContext extends ParsePackageNameOutput {
  productRoot: string;
  jobsDir: string;
  httpDir: string;
  monolithDir: string;
}

function makeJobsInitLineReplace(context: JobsInitWorkflowContext) {
  const baseReplace = makeLineReplace(context);
  const pascal = kebabCaseToPascalCase(context.serviceName);
  const camel = kebabCaseToCamelCase(context.serviceName);
  return (line: string) => {
    let out = line;
    out = out.split("@saflib/base-jobs").join(context.packageName);
    out = out
      .split("@saflib/base-service-common")
      .join(`${context.sharedPackagePrefix}-service-common`);
    out = out
      .split("@saflib/base-spec")
      .join(`${context.sharedPackagePrefix}-spec`);
    out = out.split("getBaseJobsSqlitePath").join(`get${pascal}JobsSqlitePath`);
    out = out.split("getBaseJobsDbKey").join(`get${pascal}JobsDbKey`);
    out = out.split("runBaseJobs").join(`run${pascal}Jobs`);
    out = out.split("baseTriggerMap").join(`${camel}TriggerMap`);
    out = out.split("baseJobOperations").join(`${camel}JobOperations`);
    out = out.split("baseServiceStorage").join(`${camel}ServiceStorage`);
    out = out.split("BaseServiceContext").join(`${pascal}ServiceContext`);
    return baseReplace(out);
  };
}

/**
 * Jobs are folded into the golden product (`base/service/jobs` + concrete http/monolith wiring).
 * This workflow ensures the jobs package is present — it does not re-weave parent http/monolith.
 */
export const JobsInitWorkflowDefinition = defineWorkflow<
  typeof input,
  JobsInitWorkflowContext
>({
  id: "jobs/init",

  description:
    "Ensure the product jobs package exists (http/monolith jobs wiring ships with product/init)",

  checklistDescription: ({ packageName }) =>
    `Ensure jobs weave for ${packageName}.`,

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) => {
    const productRoot = path.resolve(input.cwd, input.parent ?? ".");
    const jobsDir = path.join(productRoot, "service", "jobs");
    const httpDir = path.join(productRoot, "service", "http");
    const monolithDir = path.join(productRoot, "service", "monolith");

    let packageName = "@saflib/base-jobs";
    if (existsSync(path.join(jobsDir, "package.json"))) {
      packageName = getPackageName(jobsDir);
    } else if (existsSync(path.join(httpDir, "package.json"))) {
      const httpPkg = parsePackageName(getPackageName(httpDir), {
        requiredSuffix: "-http",
        silentError: true,
      });
      packageName = `${httpPkg.sharedPackagePrefix}-jobs`;
    }

    return {
      ...parsePackageName(packageName, {
        requiredSuffix: "-jobs",
        silentError: true,
      }),
      productRoot,
      jobsDir,
      httpDir,
      monolithDir,
      targetDir: jobsDir,
    };
  },

  templateFiles: {
    jobs: path.join(jobsRoot, "jobs.ts"),
    packageJson: path.join(jobsRoot, "package.json"),
    tsconfig: path.join(jobsRoot, "tsconfig.json"),
    vitestConfig: path.join(jobsRoot, "vitest.config.js"),
  },

  docFiles: {},

  steps: [
    step(
      CopyStepMachine,
      ({ context }) => ({
        name: context.serviceName,
        targetDir: context.jobsDir,
        templateFiles: {
          jobsPkg: jobsRoot,
        },
        lineReplace: makeJobsInitLineReplace(context),
      }),
      {
        skipIf: ({ context }) =>
          existsSync(path.join(context.jobsDir, "package.json")),
      },
    ),

    step(CdStepMachine, ({ context }) => ({
      path: context.jobsDir,
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["install"],
    })),

    step(PromptStepMachine, () => ({
      promptText: `Verify jobs weave:
      * Monolith boot order: cron (makeCronEnqueuer) → runJobs → jobs app socket → HTTP (internal socket).
      * HTTP mounts createJobsRouter before createCronRouter (concrete wiring in http.ts, outside workflow areas).
      * Dev compose persists service/jobs/data volume.`,
    })),
  ],
});

export default JobsInitWorkflowDefinition;
