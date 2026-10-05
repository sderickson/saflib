import path from "node:path";
import { readFileSync } from "node:fs";
import {
  defineWorkflow,
  step,
  parsePath,
  makeLineReplace,
  runCopyStep,
  runUpdateStep,
  runCommandStep,
  runTransformFileStep,
  type CopyStepInput,
  type UpdateStepInput,
  type CommandStepInput,
  type TransformFileStepInput,
  type ParsePathOutput,
} from "@saflib/new-workflows";
import { packageStubRoot } from "@saflib/templates";
import {
  resolveExportModulePathLayout,
  upsertPackageJsonExportsForModule,
} from "@saflib/monorepo/package-exports";

const sourceDir = packageStubRoot;
const exportDir = path.join(sourceDir, "__group-name__");

interface AddExportInput {
  path: string;
  /** What the export should actually do, e.g. "parse a kebab-case package name into its parts". */
  prompt?: string;
}

interface AddExportWorkflowContext extends ParsePathOutput {
  cwd: string;
  packageName: string;
  prompt?: string;
}

function readPackageName(cwd: string): string {
  const pj = JSON.parse(readFileSync(path.join(cwd, "package.json"), "utf8")) as {
    name: string;
  };
  return pj.name;
}

/**
 * Ported from `monorepo/workflows/add-export.ts` — same templates, same
 * prompts, same step order, running on the new sqlite-backed engine
 * instead of XState.
 */
export const AddExportWorkflowDefinition = defineWorkflow<
  AddExportInput,
  AddExportWorkflowContext
>({
  id: "monorepo/add-export",

  description: "Add new exports (functions, classes, interfaces) to packages",

  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description:
          "Path of the new export module (e.g., './lib/myFunction.ts' or './http/headers.ts')",
      },
      prompt: {
        type: "string",
        description:
          "What the export should actually do, e.g. 'parse a kebab-case package name into its parts'. Passed to the agent implementing it.",
      },
    },
    required: ["path"],
  },

  context: ({ input, cwd }) => {
    const pathResult = parsePath(input.path, {
      requiredPrefix: "./",
      requiredSuffix: ".ts",
      cwd,
    });
    resolveExportModulePathLayout(pathResult.groupName, pathResult.targetName);

    return {
      ...pathResult,
      cwd,
      packageName: readPackageName(cwd),
      prompt: input.prompt,
    };
  },

  steps: [
    step<CopyStepInput, AddExportWorkflowContext>("copy", runCopyStep, ({ context }) => ({
      templateFiles: {
        export: path.join(exportDir, "__target-name__.ts"),
        test: path.join(exportDir, "__target-name__.test.ts"),
      },
      name: context.targetName,
      targetDir: context.cwd,
      lineReplace: makeLineReplace(context),
      // Both template files live directly inside `__group-name__/`, with
      // nothing anchored a level above it — the auto-detected shared
      // prefix would land on that directory itself, dropping it from the
      // output path instead of reconstructing it (renamed via
      // `lineReplace`) under `targetDir`. `sourceDir` (its parent) fixes
      // that explicitly. See `CopyStepInput.templateRoot`'s doc comment.
      templateRoot: sourceDir,
    })),

    step<TransformFileStepInput, AddExportWorkflowContext>(
      "transform-file",
      runTransformFileStep,
      ({ context }) => ({
        filePath: "package.json",
        description: `Add glob export for ./${resolveExportModulePathLayout(context.groupName, context.targetName).topLevelSegment}/*`,
        transform: (content: string) => {
          const pkg = JSON.parse(content) as Parameters<
            typeof upsertPackageJsonExportsForModule
          >[0];
          return (
            JSON.stringify(
              upsertPackageJsonExportsForModule(pkg, context.groupName, context.targetName),
              null,
              2,
            ) + "\n"
          );
        },
      }),
    ),

    step<UpdateStepInput, AddExportWorkflowContext>("update", runUpdateStep, ({ context }) => ({
      fileId: "export",
      prompt: `${context.prompt ? `Task: ${context.prompt}\n\n` : ""}Update **${context.targetName}.ts** to implement the ${context.targetName} export.`,
    })),

    step<UpdateStepInput, AddExportWorkflowContext>("update", runUpdateStep, ({ context }) => ({
      fileId: "test",
      prompt: `${context.prompt ? `The export implements: ${context.prompt}\n\n` : ""}Update **${context.targetName}.test.ts** to test the ${context.targetName} functionality.

Prefer factories from product \`*-test\` packages when the unit under test deals with OpenAPI/service model shapes.`,
    })),

    step<CommandStepInput, AddExportWorkflowContext>("command", runCommandStep, () => ({
      command: "npm",
      args: ["run", "test"],
    })),

    step<CommandStepInput, AddExportWorkflowContext>("command", runCommandStep, () => ({
      command: "npm",
      args: ["exec", "saf-docs", "generate"],
    })),
  ],
});

export default AddExportWorkflowDefinition;
