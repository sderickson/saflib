import {
  CopyStepMachine,
  UpdateStepMachine,
  PromptStepMachine,
  CommandStepMachine,
  TransformFileStepMachine,
  defineWorkflow,
  step,
  CdStepMachine,
  makeLineReplace,
} from "@saflib/workflows";
import path from "node:path";
import { packageStubRoot } from "@saflib/templates";
import { prepareNewPackageExports } from "../src/package-exports.ts";

const sourceDir = packageStubRoot;

const input = [
  {
    name: "name",
    description:
      "The desired package name, including scope (e.g., @your-org/package-name)",
    exampleValue: "@example-org/example-package",
  },
  {
    name: "path",
    description:
      "The RELATIVE path from monorepo root where the package directory (containing package.json) will be created (e.g., my-product/lib/my-lib or saflib/node)",
    exampleValue: "my-product/lib/my-lib",
  },
] as const;

interface AddTsPackageWorkflowContext {
  name: string;
  targetDir: string;
  packageName: string; // e.g. "@your-org/package-name"
  packageDirName: string; // e.g. "package-name"
  path: string; // Relative path from monorepo root
  rootDir: string;
}

export const AddTsPackageWorkflowDefinition = defineWorkflow<
  typeof input,
  AddTsPackageWorkflowContext
>({
  id: "monorepo/add-package",

  description:
    "Creates a new TypeScript package according to monorepo best practices.",

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) => {
    const targetDir = path.join(input.cwd, input.path);
    const packageDirName = path.basename(input.path);

    return {
      name: input.name,
      targetDir,
      packageName: input.name,
      packageDirName,
      path: input.path,
      rootDir: input.cwd,
    };
  },

  templateFiles: {
    packageJson: path.join(sourceDir, "package.json"),
    tsconfig: path.join(sourceDir, "tsconfig.json"),
    vitest: path.join(sourceDir, "vitest.config.js"),
  },

  docFiles: {},

  steps: [
    step(CopyStepMachine, ({ context }) => {
      const defaultLineReplace = makeLineReplace(context);
      const lineReplace = (line: string) => {
        let newLine = line.replace("template-package", context.packageName);
        return defaultLineReplace(newLine);
      };
      return {
        name: context.packageDirName,
        targetDir: context.targetDir,
        lineReplace,
        // Export stubs belong to monorepo/add-export, not a new package shell.
        skipSourceGlobs: ["**/__group-name__/**"],
      };
    }),

    step(TransformFileStepMachine, ({ context }) => ({
      filePath: path.join(context.targetDir, "package.json"),
      description: `Clear template export placeholders in ${path.join(context.path, "package.json")}`,
      transform: (content: string) => {
        const pkg = JSON.parse(content) as Parameters<
          typeof prepareNewPackageExports
        >[0];
        return JSON.stringify(prepareNewPackageExports(pkg), null, 2) + "\n";
      },
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "packageJson",
      promptMessage: `The file '${path.join(context.path, "package.json")}' has been created. Please update the "description" field and any other fields as needed, such as dependencies on other SAF libraries.

Do not add a root \`"."\` barrel. Glob exports (and matching package-local \`#\` imports) are added automatically by \`monorepo/add-export\` when you add the first module under a top-level folder. Prefer \`#lib/foo.ts\` over \`../\` climbs inside the package.`,
    })),

    step(PromptStepMachine, ({ context }) => ({
      promptText: `Ensure the new package path '${context.path}' is included in the "workspaces" array in the root \`package.json\`.
      
      For example: \`"workspaces": ["${context.path}", "other-packages/*"]\`

      Source modules belong under thematic folders (e.g. \`lib/\`, \`http/\`), not at the package root. Add modules with \`monorepo/add-export\`. Same-package imports should use \`#…\` (see package.json \`imports\`).`,
    })),

    step(CdStepMachine, ({ context }) => ({
      path: context.targetDir,
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["install"],
    })),

    step(CdStepMachine, ({ context }) => ({
      path: context.rootDir,
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: [
        "exec",
        "saf-imports",
        "tsconfig",
        "generate",
        "--",
        "--write",
      ],
    })),

    step(CdStepMachine, ({ context }) => ({
      path: context.targetDir,
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["run", "typecheck"],
    })),
  ],
});

export default AddTsPackageWorkflowDefinition;
