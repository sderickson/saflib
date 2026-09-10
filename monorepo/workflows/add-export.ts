import {
  CopyStepMachine,
  UpdateStepMachine,
  defineWorkflow,
  step,
  CommandStepMachine,
  TransformFileStepMachine,
  parsePath,
  makeLineReplace,
  type ParsePathOutput,
} from "@saflib/workflows";
import path from "node:path";
import { readFileSync } from "node:fs";
import { packageStubRoot } from "@saflib/templates";
import {
  resolveExportModulePathLayout,
  upsertPackageJsonExportsForModule,
} from "../src/package-exports.ts";

const sourceDir = packageStubRoot;
const exportDir = path.join(sourceDir, "__group-name__");

const input = [
  {
    name: "path",
    description:
      "Path of the new export module (e.g., './lib/myFunction.ts' or './http/headers.ts')",
    exampleValue: "./lib/myFunction.ts",
  },
] as const;

interface AddExportWorkflowContext extends ParsePathOutput {
  packageName: string;
}

function readPackageName(cwd: string): string {
  const pj = JSON.parse(readFileSync(path.join(cwd, "package.json"), "utf8")) as {
    name: string;
  };
  return pj.name;
}

export const AddExportWorkflowDefinition = defineWorkflow<
  typeof input,
  AddExportWorkflowContext
>({
  id: "monorepo/add-export",

  description: "Add new exports (functions, classes, interfaces) to packages",

  checklistDescription: ({ groupName, targetName }) =>
    `Add ${groupName}/${targetName} export.`,

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) => {
    const pathResult = parsePath(input.path, {
      requiredPrefix: "./",
      requiredSuffix: ".ts",
      cwd: input.cwd,
    });
    resolveExportModulePathLayout(pathResult.groupName, pathResult.targetName);

    return {
      ...pathResult,
      targetDir: input.cwd,
      packageName: readPackageName(input.cwd),
    };
  },

  templateFiles: {
    export: path.join(exportDir, "__target-name__.ts"),
    test: path.join(exportDir, "__target-name__.test.ts"),
  },

  versionControl: {
    allowPaths: ["./docs/**"],
  },

  docFiles: {},

  steps: [
    step(CopyStepMachine, ({ context }) => ({
      name: context.targetName,
      targetDir: context.targetDir,
      lineReplace: makeLineReplace(context),
    })),

    step(TransformFileStepMachine, ({ context }) => ({
      filePath: "package.json",
      description: `Add glob export for ./${resolveExportModulePathLayout(context.groupName, context.targetName).topLevelSegment}/*`,
      transform: (content: string) => {
        const pkg = JSON.parse(content) as Parameters<
          typeof upsertPackageJsonExportsForModule
        >[0];
        return (
          JSON.stringify(
            upsertPackageJsonExportsForModule(
              pkg,
              context.groupName,
              context.targetName,
            ),
            null,
            2,
          ) + "\n"
        );
      },
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "export",
      promptMessage: `Update **${path.basename(context.copiedFiles!.export)}** to implement the ${context.targetName} export.`,
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "test",
      promptMessage: `Update **${path.basename(context.copiedFiles!.test)}** to test the ${context.targetName} functionality.
      
      Prefer factories from product \`*-test\` packages when the unit under test deals with OpenAPI/service model shapes.`,
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["run", "test"],
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["exec", "saf-docs", "generate"],
    })),
  ],
});

export default AddExportWorkflowDefinition;
