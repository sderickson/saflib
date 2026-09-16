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
  type CopyStepInput,
  type CdStepInput,
  type CommandStepInput,
  type ParsePackageNameOutput,
} from "@saflib/new-workflows";
import { kebabCaseToPascalCase, kebabCaseToCamelCase } from "@saflib/utils";
import { templatesProductRoot } from "@saflib/templates";

const cronRoot = path.join(templatesProductRoot, "service/cron");

interface CronInitInput {
  /** Optional path to the product root (default: cwd). Ensures service/cron exists and weaves cron into http + monolith. */
  parent?: string;
}

interface CronInitWorkflowContext extends ParsePackageNameOutput {
  productRoot: string;
  cronDir: string;
  httpDir: string;
  monolithDir: string;
}

function makeCronInitLineReplace(context: CronInitWorkflowContext) {
  const baseReplace = makeLineReplace(context);
  const pascal = kebabCaseToPascalCase(context.serviceName);
  const camel = kebabCaseToCamelCase(context.serviceName);
  return (line: string) => {
    let out = line;
    out = out.split("@saflib/base-cron").join(context.packageName);
    out = out
      .split("@saflib/base-service-common")
      .join(`${context.sharedPackagePrefix}-service-common`);
    out = out
      .split("getBaseCronSqlitePath")
      .join(`get${pascal}CronSqlitePath`);
    out = out.split("getBaseCronDbKey").join(`get${pascal}CronDbKey`);
    out = out.split("runBaseCron").join(`run${pascal}Cron`);
    out = out.split("baseJobs").join(`${camel}Jobs`);
    out = out.split("baseServiceStorage").join(`${camel}ServiceStorage`);
    out = out.split("BaseServiceContext").join(`${pascal}ServiceContext`);
    return baseReplace(out);
  };
}

/**
 * Ported from `cron/cron-http/workflows/init.ts` — same templates, same
 * prompts, same step order, running on the new sqlite-backed engine
 * instead of XState.
 *
 * Cron is folded into the golden product (`base/service/cron` + concrete
 * http/monolith wiring). This workflow ensures the cron package is present
 * — it does not re-weave parent http/monolith.
 */
export const CronInitWorkflowDefinition = defineWorkflow<
  CronInitInput,
  CronInitWorkflowContext
>({
  id: "cron/init",

  description:
    "Ensure the product cron package exists (http/monolith cron wiring ships with product/init)",

  inputSchema: {
    type: "object",
    properties: {
      parent: {
        type: "string",
        description:
          "Optional path to the product root (default: cwd). Ensures service/cron exists and weaves cron into http + monolith.",
      },
    },
  },

  context: ({ input, cwd }) => {
    const productRoot = path.resolve(cwd, input.parent ?? ".");
    const cronDir = path.join(productRoot, "service", "cron");
    const httpDir = path.join(productRoot, "service", "http");
    const monolithDir = path.join(productRoot, "service", "monolith");

    let packageName = "@saflib/base-cron";
    if (existsSync(path.join(cronDir, "package.json"))) {
      packageName = getPackageName(cronDir);
    } else if (existsSync(path.join(httpDir, "package.json"))) {
      const httpPkg = parsePackageName(getPackageName(httpDir), {
        requiredSuffix: "-http",
        silentError: true,
      });
      packageName = `${httpPkg.sharedPackagePrefix}-cron`;
    }

    return {
      ...parsePackageName(packageName, {
        requiredSuffix: "-cron",
        silentError: true,
      }),
      productRoot,
      cronDir,
      httpDir,
      monolithDir,
    };
  },

  steps: [
    // Copy cron package only when missing (product/init usually already did).
    stepSkipIf<CopyStepInput, CronInitWorkflowContext>(
      ({ context }) => existsSync(path.join(context.cronDir, "package.json")),
      "copy",
      runCopyStep,
      ({ context }) => ({
        name: context.serviceName,
        targetDir: context.cronDir,
        templateFiles: {
          cronPkg: cronRoot,
        },
        lineReplace: makeCronInitLineReplace(context),
        // Job expansion stubs belong to cron/add-job.
        skipSourceGlobs: ["**/__group-name__/**"],
      }),
    ),

    step<CdStepInput, CronInitWorkflowContext>("cd", runCdStep, ({ context }) => ({
      path: context.cronDir,
    })),

    step<CommandStepInput, CronInitWorkflowContext>("command", runCommandStep, () => ({
      command: "npm",
      args: ["install"],
    })),
  ],
});

export default CronInitWorkflowDefinition;
