import {
  CopyStepMachine,
  UpdateStepMachine,
  CommandStepMachine,
  defineWorkflow,
  step,
  makeWorkflowMachine,
  type ParsePackageNameOutput,
  type ParsePathOutput,
  parsePath,
  parsePackageName,
  getPackageName,
  makeLineReplace,
} from "@saflib/workflows";
import { ServiceAddStoreWorkflowDefinition } from "@saflib/service/workflows/add-store";
import path from "node:path";

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
  extends ParsePackageNameOutput,
    ParsePathOutput {
  upload: boolean;
  storeName: string;
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
    const pathResult = parsePath(input.path, {
      requiredSuffix: ".ts",
      cwd: input.cwd,
      requiredPrefix: "./routes/",
    });
    const storeName = `${pathResult.groupName}-file-container`;
    return {
      ...parsePackageName(getPackageName(input.cwd), {
        silentError: true, // so checklists don't error
        requiredSuffix: "-http",
      }),
      ...pathResult,
      storeName,
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
    allowPaths: [
      "**/context.ts",
      "**/common/package.json",
      "**/http.ts",
      "**/package.json",
    ],
  },

  steps: [
    step(
      makeWorkflowMachine(ServiceAddStoreWorkflowDefinition),
      ({ context }) => ({
        name: `${context.groupName}FileContainer`,
        cwd: path.join(path.dirname(context.cwd), "common"),
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
      - Include db -> http mapper functions in the adjacent ${context.copiedFiles?.helpers} file.
      - For delete handlers that operate on child resources (e.g. deleting a file belonging to a recipe), validate the parent relationship *before* deleting. Fetch the record first, check that the parent ID matches, return 404 if not, and only then perform the delete. This avoids destroying data before returning an error.${
        context.upload
          ? `

      This handler includes file upload support:
      - Ensure the router's index.ts passes \`fileUploader: uploadToDiskOptions\` (from @saflib/express) to \`createScopedMiddleware\` so multipart requests are parsed. Import \`uploadToDiskOptions\` if not already imported.
      - The file container property in the store is \`${context.groupName}FileContainer\` (e.g. recipesFileContainer). Use it to uploadFile / deleteFile / readFile.
      - \`req.files\` may be an array (multer \`.any()\`) or a keyed object (multer \`.fields()\`); the template handles both. Match the field name from the spec (e.g. \`"file"\`).
      - Create the DB record first with file metadata (blob_name, file_original_name, mimetype, size), then upload to the container. On upload failure, clean up the DB record and throw 500.`
          : ""
      }
      
      Review ${context.docFiles?.refDoc} for more details.`,
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "test",
      promptMessage: `Update the generated ${context.targetName}.test.ts file following the testing guide patterns.
        
        * Make sure to implement proper test cases that cover both success and error scenarios.
        * Do not do any mocking. Databases are in memory, and integrations have fake implementations. Do not use vitest's mock!
        * Do not test 500 or 400 responses. Just success and 401+ responses.
        * Run tests with "npm run test" in ${context.cwd}.
        
        Review ${context.docFiles?.testingGuide} for more details.`,
    })),

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
