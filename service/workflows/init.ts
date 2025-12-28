import {
  CopyStepMachine,
  defineWorkflow,
  step,
  makeWorkflowMachine,
  CommandStepMachine,
  CdStepMachine,
  type ParsePackageNameOutput,
  parsePackageName,
  makeLineReplace,
} from "@saflib/workflows";
import path from "node:path";
import { DrizzleInitWorkflowDefinition } from "@saflib/drizzle/workflows";
import { ExpressInitWorkflowDefinition } from "@saflib/express/workflows";
import { OpenapiInitWorkflowDefinition } from "@saflib/openapi/workflows";
import { SdkInitWorkflowDefinition } from "@saflib/sdk/workflows";
import { InitCommonWorkflowDefinition } from "./init-common.ts";

const sourceDir = path.join(import.meta.dirname, "service-templates");

const input = [
  {
    name: "name",
    description:
      "The name of the service package to create (e.g., '@foo/identity' or '@bar/analytics')",
    exampleValue: "example-service",
  },
  {
    name: "path",
    description:
      "The path to the target directory for the service package (e.g., './services/example').",
    exampleValue: "./services/example",
  },
] as const;

interface InitServiceWorkflowContext extends ParsePackageNameOutput {
  targetDir: string;
  serviceGroupDir: string;
}

export const InitServiceWorkflowDefinition = defineWorkflow<
  typeof input,
  InitServiceWorkflowContext
>({
  id: "service/init",

  description:
    "Create a new complete service package with database, HTTP server, API spec, and service orchestration",

  checklistDescription: ({ serviceName }) =>
    `Create a new ${serviceName} service package with all components.`,

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) => {
    const parsed = parsePackageName(input.name, {
      requiredSuffix: "-service",
    });
    if (!input.path.endsWith(`/service`)) {
      throw new Error(
        `The path must end with the service name, e.g. ${path.dirname(input.path)}/service`,
      );
    }
    const targetDir = path.join(
      input.cwd,
      input.path,
      parsed.serviceName + "-service",
    );
    return {
      ...parsed,
      targetDir,
      serviceGroupDir: input.path,
    };
  },

  templateFiles: {
    packageJson: path.join(sourceDir, "package.json"),
    tsconfig: path.join(sourceDir, "tsconfig.json"),
    vitestConfig: path.join(sourceDir, "vitest.config.js"),
    dockerfile: path.join(sourceDir, "Dockerfile.template"),
    runScript: path.join(sourceDir, "run.ts"),
    envSchema: path.join(sourceDir, "env.schema.combined.json"),
    index: path.join(sourceDir, "index.ts"),
    test: path.join(sourceDir, "index.test.ts"),
  },

  docFiles: {},

  versionControl: {
    allowPaths: ["./env.ts"],
  },

  steps: [
    // openapi
    step(makeWorkflowMachine(OpenapiInitWorkflowDefinition), ({ context }) => ({
      name: context.sharedPackagePrefix + "-spec",
      path: path.join(context.serviceGroupDir, "spec"),
    })),

    // drizzle
    step(makeWorkflowMachine(DrizzleInitWorkflowDefinition), ({ context }) => ({
      name: context.sharedPackagePrefix + "-db",
      path: path.join(context.serviceGroupDir, "db"),
    })),

    // sdk
    step(makeWorkflowMachine(SdkInitWorkflowDefinition), ({ context }) => ({
      name: context.sharedPackagePrefix + "-sdk",
      path: path.join(context.serviceGroupDir, "sdk"),
    })),

    // common
    step(makeWorkflowMachine(InitCommonWorkflowDefinition), ({ context }) => ({
      name: context.sharedPackagePrefix + "-service-common",
      path: path.join(context.serviceGroupDir, "common"),
    })),

    // express
    step(makeWorkflowMachine(ExpressInitWorkflowDefinition), ({ context }) => ({
      name: context.sharedPackagePrefix + "-http",
      path: path.join(context.serviceGroupDir, "http"),
    })),

    // // service itself
    step(CopyStepMachine, ({ context }) => ({
      name: context.serviceName,
      targetDir: context.targetDir,
      lineReplace: makeLineReplace(context),
    })),

    step(CdStepMachine, ({ context }) => ({
      path: context.targetDir,
    })),
    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["exec", "saf-env", "generate", "--", "-c"],
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["install"],
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["test"],
    })),
  ],
});
