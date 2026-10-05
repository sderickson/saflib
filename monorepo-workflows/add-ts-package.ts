import path from "node:path";
import {
  defineWorkflow,
  step,
  makeLineReplace,
  runCopyStep,
  runUpdateStep,
  runPromptStep,
  runCommandStep,
  runTransformFileStep,
  runCdStep,
  type CopyStepInput,
  type UpdateStepInput,
  type PromptStepInput,
  type CommandStepInput,
  type TransformFileStepInput,
  type CdStepInput,
} from "@saflib/new-workflows";
import { packageStubRoot } from "@saflib/templates";
import { prepareNewPackageExports } from "@saflib/monorepo/package-exports";

const sourceDir = packageStubRoot;

interface AddTsPackageInput {
  name: string;
  path: string;
  /** What the package should actually do, e.g. "shared date-formatting helpers". */
  prompt?: string;
}

interface AddTsPackageWorkflowContext {
  name: string;
  targetDir: string;
  packageName: string; // e.g. "@your-org/package-name"
  packageDirName: string; // e.g. "package-name"
  path: string; // Relative path from monorepo root
  rootDir: string;
  prompt?: string;
}

/**
 * Ported from `monorepo/workflows/add-ts-package.ts` — same templates,
 * same prompts, same step order, running on the new sqlite-backed engine
 * instead of XState.
 */
export const AddTsPackageWorkflowDefinition = defineWorkflow<
  AddTsPackageInput,
  AddTsPackageWorkflowContext
>({
  id: "monorepo/add-package",

  description: "Creates a new TypeScript package according to monorepo best practices.",

  inputSchema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "The desired package name, including scope (e.g., @your-org/package-name)",
      },
      path: {
        type: "string",
        description:
          "The RELATIVE path from monorepo root where the package directory (containing package.json) will be created (e.g., my-product/lib/my-lib or saflib/node)",
      },
      prompt: {
        type: "string",
        description:
          "What the package should actually do, e.g. 'shared date-formatting helpers'. Passed to the agent implementing it.",
      },
    },
    required: ["name", "path"],
  },

  context: ({ input, cwd }) => {
    const targetDir = path.join(cwd, input.path);
    const packageDirName = path.basename(input.path);

    return {
      name: input.name,
      targetDir,
      packageName: input.name,
      packageDirName,
      path: input.path,
      rootDir: cwd,
      prompt: input.prompt,
    };
  },

  steps: [
    step<CopyStepInput, AddTsPackageWorkflowContext>("copy", runCopyStep, ({ context }) => {
      const defaultLineReplace = makeLineReplace(context);
      // `__group-name__`/`__target-name__` placeholders in package.json's
      // exports/imports are intentionally left for `prepareNewPackageExports`
      // (the transform-file step below) to strip out — they have no
      // context value here since this workflow doesn't scaffold a real
      // export. Shield them from the interpolation regex so it doesn't throw
      // on an unresolved token, then restore them verbatim.
      const shield = (line: string) =>
        line.replace(/__group-name__/g, " group-name ").replace(/__target-name__/g, " target-name ");
      const unshield = (line: string) =>
        line.replace(/ group-name /g, "__group-name__").replace(/ target-name /g, "__target-name__");
      const lineReplace = (line: string) => {
        const newLine = shield(line).replace("template-package", context.packageName);
        return unshield(defaultLineReplace(newLine));
      };
      return {
        templateFiles: {
          packageJson: path.join(sourceDir, "package.json"),
          tsconfig: path.join(sourceDir, "tsconfig.json"),
          vitest: path.join(sourceDir, "vitest.config.js"),
        },
        name: context.packageDirName,
        targetDir: context.targetDir,
        lineReplace,
        // Export stubs belong to monorepo/add-export, not a new package shell.
        skipSourceGlobs: ["**/__group-name__/**"],
      };
    }),

    step<TransformFileStepInput, AddTsPackageWorkflowContext>(
      "transform-file",
      runTransformFileStep,
      ({ context }) => ({
        filePath: path.join(context.targetDir, "package.json"),
        description: `Clear template export placeholders in ${path.join(context.path, "package.json")}`,
        transform: (content: string) => {
          const pkg = JSON.parse(content) as Parameters<typeof prepareNewPackageExports>[0];
          return JSON.stringify(prepareNewPackageExports(pkg), null, 2) + "\n";
        },
      }),
    ),

    step<UpdateStepInput, AddTsPackageWorkflowContext>("update", runUpdateStep, ({ context }) => ({
      fileId: "packageJson",
      prompt: `${context.prompt ? `Task: ${context.prompt}\n\n` : ""}The file '${path.join(context.path, "package.json")}' has been created. Please update the "description" field and any other fields as needed, such as dependencies on other SAF libraries.

Do not add a root \`"."\` barrel. Glob exports (and matching package-local \`#\` imports) are added automatically by \`monorepo/add-export\` when you add the first module under a top-level folder. Prefer \`#lib/foo.ts\` over \`../\` climbs inside the package.`,
    })),

    step<PromptStepInput, AddTsPackageWorkflowContext>("prompt", runPromptStep, ({ context }) => ({
      prompt: `Ensure the new package path '${context.path}' is included in the "workspaces" array in the root \`package.json\`.

For example: \`"workspaces": ["${context.path}", "other-packages/*"]\`

Source modules belong under thematic folders (e.g. \`lib/\`, \`http/\`), not at the package root. Add modules with \`monorepo/add-export\`. Same-package imports should use \`#…\` (see package.json \`imports\`).`,
    })),

    step<CdStepInput, AddTsPackageWorkflowContext>("cd", runCdStep, ({ context }) => ({
      path: context.targetDir,
    })),

    step<CommandStepInput, AddTsPackageWorkflowContext>("command", runCommandStep, () => ({
      command: "npm",
      args: ["install"],
    })),

    step<CdStepInput, AddTsPackageWorkflowContext>("cd", runCdStep, ({ context }) => ({
      path: context.rootDir,
    })),

    step<CommandStepInput, AddTsPackageWorkflowContext>("command", runCommandStep, () => ({
      command: "npm",
      args: ["exec", "saf-imports", "tsconfig", "generate", "--", "--write"],
    })),

    step<CdStepInput, AddTsPackageWorkflowContext>("cd", runCdStep, ({ context }) => ({
      path: context.targetDir,
    })),

    step<CommandStepInput, AddTsPackageWorkflowContext>("command", runCommandStep, () => ({
      command: "npm",
      args: ["run", "typecheck"],
    })),
  ],
});

export default AddTsPackageWorkflowDefinition;
