import {
  CopyStepMachine,
  UpdateStepMachine,
  PromptStepMachine,
  TestStepMachine,
  defineWorkflow,
  step,
  parsePath,
  parsePackageName,
  getPackageName,
  makeLineReplace,
  type ParsePathOutput,
  type ParsePackageNameOutput,
} from "@saflib/workflows";
import path from "node:path";

// TODO: update this to the actual source directory for your workflow (typically just "templates")
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
interface __TargetName__WorkflowContext
  extends ParsePathOutput,
    ParsePackageNameOutput {
  exampleProperty: string;
}

export const __TargetName__WorkflowDefinition = defineWorkflow<
  typeof input,
  __TargetName__WorkflowContext
>({
  id: "__workflow-namespace__/__target-name__",

  // TODO: replace with a description based on the context, also in the present tense like a good commit message.
  description: "Create a new __target-name__",

  // TODO: replace with a description based on the context, also in the present tense like a good commit message.
  checklistDescription: ({ targetName }) =>
    `Create a new ${targetName} __target-name__.`,

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) => {
    console.log("input", input);
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

  // TODO: create the template-files dir and add template files
  // Include TODOs like this file does.
  // Instances of "__target-name__" in the file name and content will be replaced with the "name" given to CopyStepMachine
  /* do not replace */ templateFiles: {
    main: path.join(sourceDir, "__target-name__.ts"),
    test: path.join(sourceDir, "__target-name__.test.ts"),
  },

  // TODO: add documentation file references
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
      promptMessage: `Update **${path.basename(context.copiedFiles!.main)}** to implement the main functionality. Replace any TODO comments with actual implementation.`,
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "test",
      promptMessage: `Update **${path.basename(context.copiedFiles!.test)}** to test the functionality you implemented. Make sure to mock any external dependencies.`,
    })),

    step(TestStepMachine, () => ({
      fileId: "test",
    })),

    step(PromptStepMachine, ({ context }) => ({
      promptText: `Verify that the ${context.targetName} workflow is working correctly. Test the functionality manually and ensure all files are properly configured.`,
    })),
  ],
});
