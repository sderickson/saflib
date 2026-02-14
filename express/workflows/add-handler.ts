import {
  CopyStepMachine,
  UpdateStepMachine,
  CommandStepMachine,
  PromptStepMachine,
  defineWorkflow,
  step,
  type ParsePackageNameOutput,
  type ParsePathOutput,
  parsePath,
  parsePackageName,
  getPackageName,
  makeLineReplace,
} from "@saflib/workflows";
import path from "node:path";
import { readFileSync } from "node:fs";

const sourceDir = path.join(import.meta.dirname, "templates");

const input = [
  {
    name: "path",
    description: "Path of the new handler (e.g. 'routes/todos/create')",
    exampleValue: "./routes/example-subpath/example-handler.ts",
  },
  {
    name: "upload",
    type: "flag" as const,
    description:
      "Include file upload handling (multipart); shunt file data to a container in the store",
  },
] as const;

interface AddHandlerWorkflowContext
  extends ParsePackageNameOutput, ParsePathOutput {
  upload: boolean;
}

export const AddHandlerWorkflowDefinition = defineWorkflow<
  typeof input,
  AddHandlerWorkflowContext
>({
  id: "express/add-handler",

  description: "Add a new route to an Express.js service.",

  checklistDescription: ({ packageName, targetName }) =>
    `Add ${targetName} route handler to ${packageName}.`,

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) => {
    return {
      ...parsePackageName(getPackageName(input.cwd), {
        silentError: true, // so checklists don't error
        requiredSuffix: "-http",
      }),
      ...parsePath(input.path, {
        requiredSuffix: ".ts",
        cwd: input.cwd,
        requiredPrefix: "./routes/",
      }),
      targetDir: input.cwd,
      upload: input.upload ?? false,
    };
  },

  templateFiles: {
    handler: path.join(sourceDir, "routes/__group-name__/__target-name__.ts"),
    test: path.join(sourceDir, "routes/__group-name__/__target-name__.test.ts"),
    index: path.join(sourceDir, "routes/__group-name__/index.ts"),
    http: path.join(sourceDir, "http.ts"),
    helpers: path.join(sourceDir, "routes/__group-name__/_helpers.ts"),
  },

  docFiles: {
    refDoc: path.join(import.meta.dirname, "../docs/03-routes.md"),
    testingGuide: path.join(import.meta.dirname, "../docs/04-testing.md"),
  },

  versionControl: {
    allowPaths: ["**/context.ts"],
  },

  steps: [
    step(
      PromptStepMachine,
      ({ context }) => ({
        prompt: `Find or add a place in the service's common store (e.g. AsyncLocalStorage context) to hold uploaded files.

- Locate where the request-scoped context is created (usually in an adjacent common package) and what type it has.
- Ensure the context includes an ObjectStore (or similar) for file blobs—e.g. a property like \`emptyFormContainer\` or \`${context.groupName}FileContainer\`.
- If it doesn't exist, add the container to the context type, create it where the context is built (using a @saflib/object-store implementation), upsert it, and pass it into the context.
- You will use this container in the handler to shunt uploaded file data (uploadFile, deleteFile, readFile). See @saflib/object-store library for details.`,
      }),
      { skipIf: ({ context }) => !context.upload },
    ),

    step(CopyStepMachine, ({ context }) => ({
      name: context.targetName,
      targetDir: context.targetDir,
      lineReplace: makeLineReplace(context),
      flags: { upload: context.upload },
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "handler",
      promptMessage: `Implement the ${context.targetName} route handler.
      
      Make sure to:
      - Use createHandler from @saflib/express
      - Use types from your OpenAPI spec for request/response bodies
      - Use mapper functions from routes/_helpers.ts to convert database models to API responses
      - Handle expected errors from service/DB layers, with "satisfies never" for exhaustive error handling
      - Let unexpected errors propagate to central error handler (no try/catch!)
      - Follow the pattern in the reference doc
      - Use the handler in the adjacent "index.ts" file.
      - Include db -> http mapper functions in the adjacent ${context.copiedFiles?.helpers} file.${
        context.upload
          ? `

      This handler includes file upload support. Use the file container you added or found in the store (e.g. emptyFormContainer). Validate req.files, read the file buffer, unlink the temp file early, then create the DB record with file metadata (blob_name, file_original_name, mimetype, size). Upload the file to the container (uploadFile) after the DB create; on upload failure, clean up the DB record and return 500.`
          : ""
      }
      
      Review ${context.docFiles?.refDoc} for more details.`,
    })),

    step(
      UpdateStepMachine,
      ({ context }) => ({
        fileId: "test",
        promptMessage: `Update the generated ${context.targetName}.test.ts file following the testing guide patterns.
        
        * Make sure to implement proper test cases that cover both success and error scenarios.
        * Do not do any mocking. Databases are in memory, and integrations have fake implementations. Do not use vitest's mock!
        * Do not test 500 or 400 responses. Just success and 401+ responses.
        
        Review ${context.docFiles?.testingGuide} for more details.`,
      }),
      {
        validate: async ({ context }) => {
          const content = readFileSync(context.copiedFiles!.test, "utf-8");
          const testLength = content.split("\n").length;
          if (testLength > 300) {
            return `Test file is too long at ${testLength} lines.
            - Try to stick to one test per status code returned, and skip testing 500 responses or 400 (openapi validation) responses.
            - If you are creating mocks or fake implementations, move those to a shared file, or to the appropriate library (libraries should provide their own mocks and fake implementations).`;
          }
          return Promise.resolve(undefined);
        },
      },
    ),

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
