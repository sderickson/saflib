import {
  // CopyStepMachine,
  // UpdateStepMachine,
  defineWorkflow,
  step,
  parsePath,
  parsePackageName,
  getPackageName,
  // makeLineReplace,
  type ParsePathOutput,
  type ParsePackageNameOutput,
  CommandStepMachine,
} from "@saflib/workflows";
// import path from "node:path";

// const sourceDir = path.join(import.meta.dirname, "../templates");

// TODO: replace this with the actual input for your workflow
// "init" workflows should take a "name" of the package and a "path" to the target directory
// "add" workflows should just take a "path" to the main file to be created
const input = [
  {
    name: "path",
    description:
      "Path of the new add-e2e-test (e.g., 'vue/example-add-e2e-test')",
    exampleValue: "./vue/example-add-e2e-test.ts",
  },
] as const;

// TODO: Remove exampleProperty and replace it with the actual context properties your workflow needs
// If not parsing path or package name, remove the appropriate type extension(s)
interface VueAddE2eTestWorkflowContext
  extends ParsePathOutput,
    ParsePackageNameOutput {
  exampleProperty: string;
}

export const VueAddE2eTestWorkflowDefinition =
  defineWorkflow<
    typeof input,
    VueAddE2eTestWorkflowContext
  >({
    id: "vue/add-e2e-test",

    // TODO: replace with a description based on the context; use imperative tense like a good commit message.
    description: "Create a new add-e2e-test",

    // TODO: replace with a description based on the context; use imperative tense like a good commit message.
    checklistDescription: ({ targetName }) =>
      `Create a new ${targetName} add-e2e-test.`,

    input,

    sourceUrl: import.meta.url,

    context: ({ input }) => {
      // TODO: replace with actual path parsing logic
      // If the package name is provided as an input, use input.name instead of getPackageName(input.cwd)
      const pathResult = parsePath(input.path, {
        requiredPrefix: "./vue/", // todo: replace with the actual directory
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

    // TODO: Add template files to an adjacent "templates" directory. Create the directory if it doesn't exist.
    // Include TODOs like this file does.
    // Instances of "add-e2e-test" in the file name and content will be replaced with the "name" given to CopyStepMachine
    // If you use parsePath and/or parsePackageName, they also provide variables for templating such as add-e2e-test and vue.
    // Include **all** files that the agent is expected to modify.
     templateFiles: {},

    // TODO: Update "allowPaths" to exclude any files or directories that are expected to change during the workflow.
    // It's important for files to either be excluded here, or included in addE2eTests, because the agent will be
    // prompted to explain and justify unexpected changes.
    // Values are minimatch patterns.
    versionControl: {
      allowPaths: ["./dist/**"],
    },

    // TODO: add documentation file references, if you were provided any.
    // these will typically be in the "docs" directory adjacent to the "workflows" directory
    docFiles: {},

    // TODO: update the steps to match the actual workflow you're creating. It will usually involve some combination of copying template files, updating files, prompting, running scripts, and running tests.
    steps: [
      // step(CopyStepMachine, ({ context }) => ({
      //   name: context.targetName,
      //   targetDir: context.targetDir,
      //   lineReplace: makeLineReplace(context),
      // })),

      // step(UpdateStepMachine, ({ context }) => ({
      //   fileId: "main",
      //   promptMessage: `Update **${path.basename(context.copiedFiles!.main)}** to implement the main functionality. Replace any TODO comments with actual implementation.

      //   Please review documentation here first: ${context.docFiles?.overview}`,
      // })),

      // step(UpdateStepMachine, ({ context }) => ({
      //   fileId: "test",
      //   promptMessage: `Update **${path.basename(context.copiedFiles!.test)}** to test the functionality you implemented. Make sure to mock any external dependencies.

      //   Please review documentation here first: ${context.docFiles?.testing}`,
      // })),

      // TODO: Remove this if the package does not have a typecheck script, or it doesn't make sense as part of the workflow.
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

export default VueAddE2eTestWorkflowDefinition;