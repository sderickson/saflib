import path from "node:path";
import { existsSync } from "node:fs";
import {
  defineWorkflow,
  step,
  stepSkipIf,
  parsePackageName,
  getPackageName,
  makeLineReplace,
  runCopyStep,
  runCdStep,
  runCommandStep,
  runPromptStep,
  type CopyStepInput,
  type CdStepInput,
  type CommandStepInput,
  type PromptStepInput,
  type ParsePackageNameOutput,
} from "@saflib/new-workflows";
import { kebabCaseToPascalCase, kebabCaseToCamelCase } from "@saflib/utils";
import { templatesProductRoot } from "@saflib/templates";

const jobsRoot = path.join(templatesProductRoot, "service/jobs");

interface JobsInitInput {
  /** Optional path to the product root (default: cwd). Ensures service/jobs exists and weaves jobs into http + monolith. */
  parent?: string;
}

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
 * Ported from `jobs/jobs-http/workflows/init.ts` — same templates, same
 * prompts, same step order, running on the new sqlite-backed engine
 * instead of XState.
 *
 * Jobs are folded into the golden product (`base/service/jobs` + concrete
 * http/monolith wiring). This workflow ensures the jobs package is present
 * — it does not re-weave parent http/monolith.
 */
export const JobsInitWorkflowDefinition = defineWorkflow<
  JobsInitInput,
  JobsInitWorkflowContext
>({
  id: "jobs/init",

  description:
    "Ensure the product jobs package exists (http/monolith jobs wiring ships with product/init)",

  inputSchema: {
    type: "object",
    properties: {
      parent: {
        type: "string",
        description:
          "Optional path to the product root (default: cwd). Ensures service/jobs exists and weaves jobs into http + monolith.",
      },
    },
  },

  context: ({ input, cwd }) => {
    const productRoot = path.resolve(cwd, input.parent ?? ".");
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
    };
  },

  steps: [
    stepSkipIf<CopyStepInput, JobsInitWorkflowContext>(
      ({ context }) => existsSync(path.join(context.jobsDir, "package.json")),
      "copy",
      runCopyStep,
      ({ context }) => ({
        name: context.serviceName,
        targetDir: context.jobsDir,
        templateFiles: {
          jobsPkg: jobsRoot,
        },
        lineReplace: makeJobsInitLineReplace(context),
      }),
    ),

    step<CdStepInput, JobsInitWorkflowContext>("cd", runCdStep, ({ context }) => ({
      path: context.jobsDir,
    })),

    step<CommandStepInput, JobsInitWorkflowContext>("command", runCommandStep, () => ({
      command: "npm",
      args: ["install"],
    })),

    step<PromptStepInput, JobsInitWorkflowContext>("prompt", runPromptStep, () => ({
      prompt: `Verify jobs weave:
      * Monolith boot order: cron (makeCronEnqueuer) → runJobs → jobs app socket → HTTP (internal socket).
      * HTTP mounts createJobsRouter before createCronRouter (concrete wiring in http.ts, outside workflow areas).
      * Dev compose persists service/jobs/data volume.`,
    })),
  ],
});

export default JobsInitWorkflowDefinition;
