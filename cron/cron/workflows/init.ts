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
} from "@saflib/workflows";
import { kebabCaseToPascalCase, kebabCaseToCamelCase } from "@saflib/utils";
import { templatesProductRoot } from "@saflib/templates";
import path from "node:path";
import { existsSync } from "node:fs";

const cronRoot = path.join(templatesProductRoot, "service/cron");
const httpLive = path.join(templatesProductRoot, "service/http/http.ts");
const monolithLive = path.join(
  templatesProductRoot,
  "service/monolith/index.ts",
);

const input = [
  {
    name: "parent",
    description:
      "Optional path to the product root (default: cwd). Ensures service/cron exists and weaves cron into http + monolith.",
    exampleValue: ".",
  },
] as const;

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
 * Cron is folded into the golden product (`base/service/cron` + weave on http/monolith).
 * This workflow upserts those weave areas and ensures the cron package is present —
 * it does not create a second cron stack.
 */
export const CronInitWorkflowDefinition = defineWorkflow<
  typeof input,
  CronInitWorkflowContext
>({
  id: "cron/init",

  description:
    "Ensure the product cron package exists and weave createCronRouter / runCron into http + monolith",

  checklistDescription: ({ packageName }) =>
    `Ensure cron weave for ${packageName}.`,

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) => {
    const productRoot = path.resolve(input.cwd, input.parent ?? ".");
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
      targetDir: cronDir,
    };
  },

  templateFiles: {
    cron: path.join(cronRoot, "cron.ts"),
    packageJson: path.join(cronRoot, "package.json"),
    tsconfig: path.join(cronRoot, "tsconfig.json"),
    vitestConfig: path.join(cronRoot, "vitest.config.js"),
    http: httpLive,
    monolith: monolithLive,
  },

  docFiles: {},

  steps: [
    // Copy cron package only when missing (product/init usually already did).
    step(
      CopyStepMachine,
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
      {
        skipIf: ({ context }) =>
          existsSync(path.join(context.cronDir, "package.json")),
      },
    ),

    step(CopyStepMachine, ({ context }) => ({
      name: context.serviceName,
      targetDir: context.httpDir,
      templateFiles: {
        http: httpLive,
      },
      lineReplace: makeCronInitLineReplace(context),
    })),

    step(CopyStepMachine, ({ context }) => ({
      name: context.serviceName,
      targetDir: context.monolithDir,
      templateFiles: {
        monolith: monolithLive,
      },
      lineReplace: makeCronInitLineReplace(context),
    })),

    step(CdStepMachine, ({ context }) => ({
      path: context.cronDir,
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["install"],
    })),
  ],
});
