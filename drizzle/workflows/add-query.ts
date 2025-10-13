import {
  CopyStepMachine,
  UpdateStepMachine,
  PromptStepMachine,
  TestStepMachine,
  DocStepMachine,
  defineWorkflow,
  step,
  CommandStepMachine,
  type ParsePathOutput,
  parsePath,
  parsePackageName,
  getPackageName,
  type ParsePackageNameOutput,
  makeLineReplace,
} from "@saflib/workflows";
import path from "node:path";

const sourceDir = path.join(
  import.meta.dirname,
  "templates/queries/example-table",
);

const input = [
  {
    name: "path",
    description: "Path of the new query (e.g. 'queries/contacts/get-by-id')",
    exampleValue: "./queries/example/example-query.ts",
  },
] as const;

interface AddQueryWorkflowContext
  extends ParsePathOutput,
    ParsePackageNameOutput {}

export const AddQueryWorkflowDefinition = defineWorkflow<
  typeof input,
  AddQueryWorkflowContext
>({
  id: "drizzle/add-query",

  description:
    "Add a new query to a database built off the drizzle-sqlite3 package.",

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) => {
    return {
      ...parsePackageName(getPackageName(input.cwd), {
        requiredSuffix: "-db",
      }),
      ...parsePath(input.path, {
        requiredPrefix: "./queries/",
        requiredSuffix: ".ts",
        cwd: input.cwd,
      }),
    };
  },

  templateFiles: {
    query: path.join(sourceDir, "__target-name__.ts"),
    test: path.join(sourceDir, "__target-name__.test.ts"),
    index: path.join(sourceDir, "index.ts"),
  },

  docFiles: {
    refDoc: path.join(import.meta.dirname, "../docs/03-queries.md"),
    testingGuide: path.join(import.meta.dirname, "../docs/04-testing.md"),
  },

  steps: [
    step(CopyStepMachine, ({ context }) => ({
      name: context.targetName,
      targetDir: context.targetDir,
      lineReplace: makeLineReplace(context),
    })),

    step(PromptStepMachine, ({ context }) => ({
      promptText: `Update \`${context.targetDir}/index.ts\` to include the new query.
        1. Import the new query from \`./${context.targetName}.ts\`
        2. Add it to the others being exported
        3. Make sure this index file is being re-exported by the root index.ts file`,
    })),

    step(DocStepMachine, () => ({
      docId: "refDoc",
    })),

    step(PromptStepMachine, () => ({
      promptText: `Add inputs/outputs as needed to the root \`types.ts\` and \`errors.ts\` files.

        * As much as possible, types should be based on the types that drizzle provides.
        * A resource not being found by ID is an error.
        * Arrors should be simple, no special constructors or anything.

        Note: Do NOT create a new \`types.ts\` or \`errors.ts\` files. Add to the existing ones next to the \`package.json\` file.`,
    })),

    step(UpdateStepMachine, () => ({
      fileId: "query",
      promptMessage: `Implement the new query following the documentation guidelines.`,
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["run", "typecheck"],
    })),

    step(DocStepMachine, () => ({
      docId: "testingGuide",
    })),

    step(UpdateStepMachine, () => ({
      fileId: "test",
      promptMessage: `Implement the generated test file.

      Aim for 100% coverage; there should be a known way to achieve every handled error. If it's not possible to cause a returned error, it should not be in the implementation.`,
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["run", "typecheck"],
      promptOnError: `You may have forgotten to provide all fields necessary. Do NOT decouple the types from the inferred types in types.ts. Instead fix the test.`,
    })),

    step(TestStepMachine, () => ({
      fileId: "test",
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["run", "typecheck"],
    })),
  ],
});
