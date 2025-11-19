import {
  CopyStepMachine,
  defineWorkflow,
  step,
  CommandStepMachine,
  CdStepMachine,
  type ParsePackageNameOutput,
  parsePackageName,
  makeLineReplace,
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

interface OpenapiInitWorkflowContext extends ParsePackageNameOutput {
  targetDir: string;
}

export const OpenapiInitWorkflowDefinition = defineWorkflow<
  typeof input,
  OpenapiInitWorkflowContext
>({
  id: "openapi/init",

  description: "Create an OpenAPI package",

  checklistDescription: ({ serviceName }) =>
    `Create the ${serviceName} OpenAPI package.`,

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) => {
    return {
      ...parsePackageName(input.name, {
        requiredSuffix: "-spec",
      }),
      targetDir: path.join(input.cwd, input.path),
    };
  },

  versionControl: {
    allowPaths: ["./dist/**", "./schemas/error.yaml"],
  },

  templateFiles: {
    openapi: path.join(sourceDir, "openapi.yaml"),
    packageJson: path.join(sourceDir, "package.json"),
    index: path.join(sourceDir, "index.ts"),
    tsconfig: path.join(sourceDir, "tsconfig.json"),
    events: path.join(sourceDir, "events/index.yaml"),
    login: path.join(sourceDir, "events/login.yaml"),
    signup: path.join(sourceDir, "events/signup.yaml"),
    signup_view: path.join(sourceDir, "events/signup_view.yaml"),
    verify_email: path.join(sourceDir, "events/verify_email.yaml"),
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
      args: ["exec", "saf-specs", "generate"],
    })),
  ],
});
