import {
  CopyStepMachine,
  defineWorkflow,
  step,
  CwdStepMachine,
  CommandStepMachine,
} from "@saflib/workflows";
import path from "node:path";

const sourceDir = path.join(import.meta.dirname, "templates");

const input = [
  {
    name: "path",
    description:
      "The path to the target directory for the identity service package (e.g., './services/example-identity')",
    exampleValue: "./services/example-identity",
  },
] as const;

interface IdentityInitWorkflowContext {
  name: string;
  targetDir: string;
  packageName: string;
}

export const IdentityInitWorkflowDefinition = defineWorkflow<
  typeof input,
  IdentityInitWorkflowContext
>({
  id: "identity/init",

  description: "Create an identity service package",

  checklistDescription: ({ packageName }) =>
    `Create the ${packageName} identity service package.`,

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) => {
    let name = path.basename(input.path);
    if (name.endsWith("-identity")) {
      name = name.slice(0, -9);
    }
    const packageName = name + "-identity";
    if (name.startsWith("@")) {
      name = name.split("/")[1];
    }
    const targetDir = path.join(input.cwd, input.path);
    return {
      name,
      targetDir,
      packageName,
    };
  },

  templateFiles: {
    packageJson: path.join(sourceDir, "package.json"),
    callbacks: path.join(sourceDir, "callbacks.ts"),
    runScript: path.join(sourceDir, "run.ts"),
    envSchema: path.join(sourceDir, "env.schema.combined.json"),
    dockerfile: path.join(sourceDir, "Dockerfile.template"),
  },

  docFiles: {},

  steps: [
    step(CopyStepMachine, ({ context }) => ({
      name: context.name,
      targetDir: context.targetDir,
      lineReplace: (line) =>
        line.replace("@template/file-identity", context.packageName),
    })),

    step(CwdStepMachine, ({ context }) => ({
      path: context.targetDir,
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["exec", "saf-env", "generate"],
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["install"],
    })),
  ],
});

export default IdentityInitWorkflowDefinition;
