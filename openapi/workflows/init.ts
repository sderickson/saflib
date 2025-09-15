import {
  CopyStepMachine,
  DocStepMachine,
  defineWorkflow,
  step,
  CommandStepMachine,
  CwdStepMachine,
} from "@saflib/workflows";
import path from "node:path";

const sourceDir = path.join(import.meta.dirname, "templates");

const input = [
  {
    name: "name",
    description:
      "The name of the API spec package to create (e.g., 'user-spec' or 'analytics-spec')",
    exampleValue: "example-spec",
  },
  {
    name: "path",
    description:
      "The path to the target directory for the API spec package (e.g., './specs/example')",
    exampleValue: "./specs/example",
  },
] as const;

interface InitWorkflowContext {
  name: string;
  targetDir: string;
  packageName: string;
  serviceName: string;
  serviceNameCapitalized: string;
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
    let serviceName = name.replace("-spec", "");
    if (serviceName.startsWith("@")) {
      serviceName = serviceName.split("/")[1];
    }
    const serviceNameCapitalized =
      serviceName.charAt(0).toUpperCase() + serviceName.slice(1);
    const targetDir = path.join(input.cwd, input.path);

    return {
      name,
      targetDir,
      packageName: name,
      serviceName,
      serviceNameCapitalized,
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
        line
          .replace("@template/file-spec", context.packageName)
          .replace("service-name", context.serviceName)
          .replace("Service Name", context.serviceNameCapitalized),
    })),

    step(CwdStepMachine, ({ context }) => ({
      path: context.targetDir,
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["exec", "saf-specs", "generate"],
    })),
  ],
});
