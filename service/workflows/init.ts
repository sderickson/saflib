import {
  CopyStepMachine,
  UpdateStepMachine,
  defineWorkflow,
  step,
  makeWorkflowMachine,
  CommandStepMachine,
  CwdStepMachine,
} from "@saflib/workflows";
import path from "node:path";
import { InitWorkflowDefinition as DrizzleInitWorkflowDefinition } from "@saflib/drizzle/workflows";
import { InitWorkflowDefinition as ExpressInitWorkflowDefinition } from "@saflib/express/workflows";
import { InitWorkflowDefinition as OpenapiInitWorkflowDefinition } from "@saflib/openapi/workflows";

const sourceDir = path.join(import.meta.dirname, "..", "templates");

const input = [
  {
    name: "path",
    description:
      "The path to the target directory for the service package (e.g., './services/example')",
    exampleValue: "./services/example",
  },
] as const;

interface InitWorkflowContext {
  serviceName: string;
  targetDir: string;
  packageName: string;
  dbPackageName: string;
  httpPackageName: string;
  specPackageName: string;
}

export const InitWorkflowDefinition = defineWorkflow<
  typeof input,
  InitWorkflowContext
>({
  id: "service/init",

  description:
    "Create a new complete service package with database, HTTP server, API spec, and service orchestration",

  checklistDescription: ({ serviceName }) =>
    `Create a new ${serviceName} service package with all components.`,

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) => {
    const serviceName = path.basename(input.path);
    const targetDir = path.join(input.cwd, input.path);
    const packageName = `@vendata/${serviceName}-service`;
    const dbPackageName = `@vendata/${serviceName}-db`;
    const httpPackageName = `@vendata/${serviceName}-http`;
    const specPackageName = `@vendata/${serviceName}-spec`;

    return {
      serviceName,
      targetDir,
      packageName,
      dbPackageName,
      httpPackageName,
      specPackageName,
    };
  },

  templateFiles: {
    packageJson: path.join(sourceDir, "package.json"),
    tsconfig: path.join(sourceDir, "tsconfig.json"),
    vitestConfig: path.join(sourceDir, "vitest.config.js"),
    dockerfile: path.join(sourceDir, "Dockerfile.template"),
    runScript: path.join(sourceDir, "bin/run.ts"),
    envSchema: path.join(sourceDir, "env.schema.combined.json"),
  },

  docFiles: {},

  steps: [
    // Initialize the API spec package
    step(makeWorkflowMachine(OpenapiInitWorkflowDefinition), ({ context }) => ({
      name: context.specPackageName,
      path: path.join(context.targetDir, "..", `${context.serviceName}-spec`),
    })),

    // Initialize the database package
    step(makeWorkflowMachine(DrizzleInitWorkflowDefinition), ({ context }) => ({
      name: context.dbPackageName,
    })),

    // Initialize the HTTP service package
    step(makeWorkflowMachine(ExpressInitWorkflowDefinition), ({ context }) => ({
      name: context.httpPackageName,
      path: path.join(context.targetDir, "..", `${context.serviceName}-http`),
    })),

    // Copy the service template files
    step(CopyStepMachine, ({ context }) => ({
      name: context.serviceName,
      targetDir: context.targetDir,
      lineReplace: (line) => {
        return line
          .replace(/@template\/template-file/g, context.packageName)
          .replace(/@template\/template-file-db/g, context.dbPackageName)
          .replace(/@template\/template-file-http/g, context.httpPackageName)
          .replace(/@template\/template-file-spec/g, context.specPackageName)
          .replace(
            /@TEMPLATE_SERVICE_HTTP_PORT/g,
            `${context.serviceName.toUpperCase()}_SERVICE_HTTP_PORT`,
          );
      },
    })),

    // Update package.json with correct dependencies
    step(UpdateStepMachine, ({ context }) => ({
      fileId: "packageJson",
      promptMessage: `Update **package.json** with the correct package name "${context.packageName}" and dependencies for ${context.serviceName} service.`,
    })),

    // Update the run script
    step(UpdateStepMachine, ({ context }) => ({
      fileId: "runScript",
      promptMessage: `Update **bin/run.ts** to properly initialize the ${context.serviceName} service with the correct database connections and HTTP server setup.`,
    })),

    // Install dependencies for the service package
    step(CwdStepMachine, ({ context }) => ({
      path: context.targetDir,
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["install"],
    })),

    // Install dependencies for the database package
    step(CwdStepMachine, ({ context }) => ({
      path: path.join(context.targetDir, "..", `${context.serviceName}-db`),
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["install"],
    })),

    // Install dependencies for the HTTP package
    step(CwdStepMachine, ({ context }) => ({
      path: path.join(context.targetDir, "..", `${context.serviceName}-http`),
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["install"],
    })),

    // Generate environment files
    step(CwdStepMachine, ({ context }) => ({
      path: context.targetDir,
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["exec", "saf-env", "generate", "--", "-c"],
    })),
  ],
});
