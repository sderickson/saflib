import {
  CopyStepMachine,
  UpdateStepMachine,
  DocStepMachine,
  defineWorkflow,
  step,
  CommandStepMachine,
} from "@saflib/workflows";
import path from "node:path";

const sourceDir = path.join(import.meta.dirname, "inits");

const input = [
  {
    name: "name",
    description:
      "The name of the API spec package to create (e.g., 'user-spec' or 'analytics-spec')",
    exampleValue: "example-spec",
  },
] as const;

interface InitWorkflowContext {
  name: string;
  targetDir: string;
  packageName: string;
  serviceName: string;
}

export const InitWorkflowDefinition = defineWorkflow<
  typeof input,
  InitWorkflowContext
>({
  id: "openapi/init",

  description:
    "Create a new API spec package following the @saflib/openapi structure and conventions",

  checklistDescription: ({ name }) => `Create a new ${name} API spec package.`,

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) => {
    let name = input.name;
    // make sure name ends with -spec
    if (!input.name.endsWith("-spec")) {
      name = input.name + "-spec";
    }
    const targetDir = path.join(input.cwd, name);
    const packageName = `@saflib/${name}`;
    const serviceName = name.replace("-spec", "");

    return {
      name,
      targetDir,
      packageName,
      serviceName,
    };
  },

  templateFiles: {
    openapi: path.join(sourceDir, "openapi.yaml"),
    packageJson: path.join(sourceDir, "package.json"),
    index: path.join(sourceDir, "index.ts"),
    tsconfig: path.join(sourceDir, "tsconfig.json"),
  },

  docFiles: {
    overview: path.join(import.meta.dirname, "../docs/01-overview.md"),
  },

  steps: [
    step(DocStepMachine, () => ({
      docId: "overview",
    })),

    step(CopyStepMachine, ({ context }) => ({
      name: context.name,
      targetDir: context.targetDir,
      lineReplace: (line) =>
        line.replace("@template/file-spec", context.packageName),
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["exec", "saf-specs", "generate"],
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "packageJson",
      promptMessage: `Update **package.json** with the correct package name "${context.packageName}" and any specific dependencies needed for this API spec package.`,
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "openapi",
      promptMessage: `Update **openapi.yaml** to define the API specification for the ${context.serviceName} service.
      
      Replace the TODO comments with actual API routes and schemas:
      - Add your API paths and operations
      - Define security schemes if needed
      - Add shared schemas for your business objects`,
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "index",
      promptMessage: `Update **index.ts** to properly export the API spec types and schemas for the ${context.serviceName} package.
      
      Replace the TODO comments with actual schema exports based on your OpenAPI specification.`,
    })),
  ],
});
