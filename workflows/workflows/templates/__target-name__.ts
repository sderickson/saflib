import {
  CopyStepMachine,
  UpdateStepMachine,
  defineWorkflow,
  step,
  parsePath,
  parsePackageName,
  getPackageName,
  makeLineReplace,
  type ParsePathOutput,
  type ParsePackageNameOutput,
  CommandStepMachine,
} from "@saflib/workflows";
import path from "node:path";

const sourceDir = path.join(import.meta.dirname, "../templates");

// TODO: replace this with the actual input for your workflow
// "init" workflows should take a "name" of the package and a "path" to the target directory
// "add" workflows should just take a "path" to the main file to be created
const input = [
  {
    name: "path",
    description:
      "Path of the new __target-name__ (e.g., '__workflow-namespace__/example-__target-name__')",
    exampleValue: "./__workflow-namespace__/example-__target-name__.ts",
  },
] as const;

// TODO: Remove exampleProperty and replace it with the actual context properties your workflow needs
// If not parsing path or package name, remove the appropriate type extension(s)
interface __WorkflowNamespace____TargetName__WorkflowContext
  extends ParsePathOutput,
    ParsePackageNameOutput {
  exampleProperty: string;
}

export const __WorkflowNamespace____TargetName__WorkflowDefinition =
  defineWorkflow<
    typeof input,
    __WorkflowNamespace____TargetName__WorkflowContext
  >({
    id: "__workflow-namespace__/__target-name__",

    // TODO: replace with a description based on the context; use imperative tense like a good commit message.
    description: "Create a new __target-name__",

    // TODO: replace with a description based on the context; use imperative tense like a good commit message.
    checklistDescription: ({ targetName }) =>
      `Create a new ${targetName} __target-name__.`,

    input,

    sourceUrl: import.meta.url,

    context: ({ input }) => {
      // TODO: replace with actual path parsing logic
      // If the package name is provided as an input, use input.name instead of getPackageName(input.cwd)
      const pathResult = parsePath(input.path, {
        requiredPrefix: "./__workflow-namespace__/", // todo: replace with the actual directory
        requiredSuffix: ".ts", // todo: replace with the actual file name suffix
        cwd: input.cwd,
      });

      const packageResult = parsePackageName(getPackageName(input.cwd), {
        // requiredSuffix: "-todo", // only include for "init" workflows, with the suffix all initialized packages will have
        // delete this line for "add" workflows
      });

      return {
        ...pathResult,
        ...packageResult,
        exampleProperty: "example value", // todo: replace with the actual context properties your workflow needs
      };
    },

    // TODO: Add template files to the adjacent templates directory
    // Include TODOs like this file does.
    // Instances of "__target-name__" in the file name and content will be replaced with the "name" given to CopyStepMachine
    // Include **all** files that the agent is expected to modify.
    /* do not replace */ templateFiles: {
      main: path.join(sourceDir, "__target-name__.ts"),
      test: path.join(sourceDir, "__target-name__.test.ts"),
    },

    // TODO: Update "ignorePaths" to exclude any files or directories that are expected to change during the workflow.
    // It's important for files to either be excluded here, or included in templateFiles, because the agent will be
    // prompted to explain and justify unexpected changes.
    manageVersionControl: {
      ignorePaths: ["dist/"],
    },

    // TODO: add documentation file references
    // these will typically be in the "docs" directory adjacent to the "workflows" directory
    docFiles: {},

    // TODO: update the steps to match the actual workflow you're creating. It will usually involve some combination of copying template files, updating files, prompting, running scripts, and running tests.
    steps: [
      step(CopyStepMachine, ({ context }) => ({
        name: context.targetName,
        targetDir: context.targetDir,
        lineReplace: makeLineReplace(context),
      })),

      step(UpdateStepMachine, ({ context }) => ({
        fileId: "main",
        promptMessage: `Update **${path.basename(context.copiedFiles!.main)}** to implement the main functionality. Replace any TODO comments with actual implementation.
        
        Please review documentation here first: ${context.docFiles?.overview}`,
      })),

      step(UpdateStepMachine, ({ context }) => ({
        fileId: "test",
        promptMessage: `Update **${path.basename(context.copiedFiles!.test)}** to test the functionality you implemented. Make sure to mock any external dependencies.
        
        Please review documentation here first: ${context.docFiles?.testing}`,
      })),

      // TODO: Remove this if the package does not have a typecheck script
      step(CommandStepMachine, () => ({
        command: "npm",
        args: ["run", "typecheck"],
      })),

      step(CommandStepMachine, () => ({
        command: "npm",
        args: ["run", "test"],
      })),
    ],
  });
