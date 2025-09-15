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

const sourceDir = path.join(import.meta.dirname, "templates");

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
  },

  docFiles: {},

  // TODO: update the steps to match the actual workflow you're creating. It will usually involve some combination of copying template files, updating files, prompting, running scripts, and running tests.
  steps: [
    step(CopyStepMachine, ({ context }) => ({
      name: context.name,
      targetDir: context.targetDir,
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "main",
      promptMessage: `Update **${path.basename(context.copiedFiles!.main)}** to implement the main functionality. Replace any TODO comments with actual implementation.`,
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "config",
      promptMessage: `Update **${path.basename(context.copiedFiles!.config)}** with the appropriate configuration for this workflow.`,
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "test",
      promptMessage: `Update **${path.basename(context.copiedFiles!.test)}** to test the functionality you implemented. Make sure to mock any external dependencies.`,
    })),

    step(TestStepMachine, () => ({
      fileId: "test",
    })),

    step(PromptStepMachine, ({ context }) => ({
      promptText: `Verify that the ${context.name} workflow is working correctly. Test the functionality manually and ensure all files are properly configured.`,
    })),
  ],
});
