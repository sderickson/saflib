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
  CdStepMachine,
} from "@saflib/workflows";
import { kebabCaseToCamelCase, kebabCaseToPascalCase } from "@saflib/utils";
import { templatesProductRoot } from "@saflib/templates";
import { ServiceAddStoreWorkflowDefinition } from "@saflib/service/workflows/add-store";
import path from "node:path";

const httpRoot = path.join(templatesProductRoot, "service", "http");
const handlerDir = path.join(httpRoot, "handlers", "__group-name__");
/** Live group-router barrel — same contour in main http and offshoots. */
const routersLive = path.join(httpRoot, "routers.ts");

const input = [
  {
    name: "path",
    description: "Path of the new handler (e.g. 'handlers/todos/create')",
    exampleValue: "./handlers/example-subpath/example-handler.ts",
  },
  {
    name: "upload",
    type: "flag" as const,
    description:
      "Include file upload handling (multipart); shunt file data to a container in the store",
  },
  {
    name: "download",
    type: "flag" as const,
    description:
      "Return binary response (e.g. stream/send file from store or generated content)",
  },
] as const;

interface AddHandlerWorkflowContext
  extends ParsePackageNameOutput,
    ParsePathOutput {
  upload: boolean;
  download: boolean;
  storeName: string;
  operationId: string;
}

export const AddHandlerWorkflowDefinition = defineWorkflow<
  typeof input,
  AddHandlerWorkflowContext
>({
  id: "express/add-handler",

  description:
    "Add a route handler, group router, slim test, and routers.ts mount. Run openapi/route and saf-specs generate first.",

  checklistDescription: ({ packageName, targetName }) =>
    `Add ${targetName} route handler to ${packageName}.`,

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) => {
    const pathResult = parsePath(input.path, {
      requiredSuffix: ".ts",
      cwd: input.cwd,
      requiredPrefix: "./handlers/",
    });
    const storeName = `${pathResult.groupName}-file-container`;
    const operationId =
      kebabCaseToCamelCase(pathResult.targetName.split(".")[0]) +
      kebabCaseToPascalCase(pathResult.groupName);
    return {
      ...parsePackageName(getPackageName(input.cwd), {
        silentError: true, // so checklists don't error
        requiredSuffix: "-http",
      }),
      ...pathResult,
      storeName,
      operationId,
      targetDir: input.cwd,
      upload: input.upload ?? false,
      download: input.download ?? false,
    };
  },

  templateFiles: {
    handler: path.join(handlerDir, "__target-name__.ts"),
    test: path.join(handlerDir, "__target-name__.test.ts"),
    index: path.join(handlerDir, "index.ts"),
    helpers: path.join(handlerDir, "_helpers.ts"),
    // Anchor sharedPrefix at httpRoot so handlers keep handlers/<group>/… paths.
    routers: routersLive,
  },

  docFiles: {
    refDoc: path.join(import.meta.dirname, "../docs/03-routes.md"),
    testingGuide: path.join(import.meta.dirname, "../docs/04-testing.md"),
  },

  versionControl: {
    allowPaths: [
      "**/context.ts",
      "**/common/package.json",
      "**/routers.ts",
      "**/http.ts",
      "**/package.json",
      "**/test/slim-route-test.ts",
    ],
  },

  steps: [
    step(CdStepMachine, () => ({
      path: "../common",
    })),

    step(
      makeWorkflowMachine(ServiceAddStoreWorkflowDefinition),
      ({ context }) => ({
        name: `${context.groupName}FileContainer`,
      }),
      { skipIf: ({ context }) => !context.upload },
    ),

    step(CdStepMachine, () => ({
      path: ".",
    })),

    step(CopyStepMachine, ({ context }) => {
      const lineReplace = makeLineReplace(context);
      return {
        name: context.targetName,
        targetDir: context.targetDir,
        flags: { upload: context.upload, download: context.download },
        lineReplace: (line: string) => {
          let out = line;
          out = out
            .split("@saflib/base-spec")
            .join(`${context.sharedPackagePrefix}-spec`);
          out = out
            .split("@saflib/base-db")
            .join(`${context.sharedPackagePrefix}-db`);
          out = out
            .split("@saflib/base-service-common")
            .join(`${context.sharedPackagePrefix}-service-common`);
          return lineReplace(out);
        },
      };
    }),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "handler",
      promptMessage: `Implement the ${context.targetName} route handler.
      
      Make sure to:
      - Use createHandler from @saflib/express
      - Import \`RequestBody\` / \`ResponseBody\` from \`@…-spec/operations/${context.operationId}\` (per-operation fragments — not a root barrel type)
      - Use mapper functions from handlers/_helpers.ts to convert database models to API responses
      - Import types from both the adjacent spec and db packages; don't declare new ones
      - Handle expected errors from service/DB layers, with "satisfies never" for exhaustive error handling
      - Let unexpected errors propagate to central error handler (no try/catch!)
      - Follow the pattern in the reference doc
      - Wire the handler in the adjacent \`index.ts\` using **per-operation** OpenAPI fragments (see below).
      - Include db -> http mapper functions in the adjacent ${context.copiedFiles?.helpers} file.
      - For delete handlers that operate on child resources (e.g. deleting a file belonging to a recipe), validate the parent relationship *before* deleting. Fetch the record first, check that the parent ID matches, return 404 if not, and only then perform the delete. This avoids destroying data before returning an error.

      **Prerequisite:** \`openapi/route\` (or equivalent) must exist for operationId \`${context.operationId}\` and \`saf-specs generate\` must have produced \`dist/operations/${context.operationId}\`.

      **Router index.ts (per-operation OpenAPI):** Register each route with Express \`router.METHOD\`, spread \`createOperationScopedMiddleware(operationJsonSpec, options)\`, then the handler. Example:

      \`\`\`ts
      router.post(
        "/path-from-spec",
        ...createOperationScopedMiddleware(createTodosOperationJsonSpec),
        createTodosHandler,
      );
      \`\`\`

      - Import \`operationJsonSpec\` from \`@…-spec/operations/${context.operationId}\` (not full \`jsonSpec\`).
      - Do **not** mount \`createScopedMiddleware({ apiSpec: jsonSpec })\` on a router prefix.
      - Products with extra middleware (e.g. org context) use a **product** helper such as \`registerOrgScopedRoute\` that wraps \`createOperationScopedMiddleware\` — do not add that to generic SAF templates.

      **Package routers.ts:** Add the group's \`create…Router()\` to \`groupRouterMounts()\` in \`routers.ts\` (workflow area). Main \`http.ts\` spreads that barrel; offshoot \`http.ts\` mounts it on the offshoot barrel router. Route handler tests mount the **group router** via \`acquireRouterSlimRouteTest\` in \`test/slim-route-test.ts\`, not \`create…HttpApp()\` with the full default mount list.

      **Router mount order (http.ts):** Platform terminators (\`createCronRouter\`, etc.) stay in main \`http.ts\` *after* \`groupRouterMounts()\` / offshoot barrels. Product group routers belong in \`routers.ts\` so they always mount before those terminators.

      **OpenAPI schemas and express-openapi-validator:** Specs are OpenAPI **3.1**. Prefer \`type: [string, "null"]\` / \`type: [array, "null"]\`, and for nullable \`$ref\` objects \`oneOf: [{ type: "null" }, { \$ref: … }]\`. Do **not** use OpenAPI 3.0 \`nullable: true\` (especially with \`allOf: [\$ref]\` and no sibling \`type\` — that used to 500). See \`@saflib/openapi\` docs/02-api-design.md.
      - After schema fixes, rebuild the spec package (\`npm run build\` in the \`-spec\` package) so \`jsonSpec\` / \`dist/openapi.json\` pick up the change.${
        context.upload
          ? `

      This handler includes file upload support:
      - Ensure the router's index.ts passes \`fileUploader: uploadToDiskOptions\` (from @saflib/express) to \`createOperationScopedMiddleware(spec, { fileUploader: uploadToDiskOptions })\` so multipart requests are parsed.
      - The file container property in the store is \`${context.groupName}FileContainer\` (e.g. recipesFileContainer). Use it to uploadFile / deleteFile / readFile.
      - \`req.files\` may be an array (multer \`.any()\`) or a keyed object (multer \`.fields()\`); the template handles both. Match the field name from the spec (e.g. \`"file"\`).
      - Create the DB record first with file metadata (blob_name, file_original_name, mimetype, size), then upload to the container. On upload failure, clean up the DB record and throw 500.`
          : ""
      }${
        context.download
          ? `

      This handler returns a binary response (file download or serve):
      - Use \`res.status(200).contentType(<mediaType>).send(buffer)\` or stream with \`res.setHeader("Content-Type", ...)\` and piping. Set the Content-Type to match the OpenAPI spec (e.g. \`application/octet-stream\` or a specific type like \`application/pdf\`).
      - If the binary comes from a store, use the container's \`readFile\` and handle FileNotFoundError / PathTraversalError / StorageError appropriately (404, 400, 500).
      - Set Content-Disposition as appropriate for the endpoint's purpose: use \`attachment\` (with filename) for save-to-disk flows, or \`inline\` (or omit) for serving the file for display (e.g. in an img tag).`
          : ""
      }
      
      Review ${context.docFiles?.refDoc} for more details.`,
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "test",
      promptMessage: `Update the generated ${context.targetName}.test.ts file following the testing guide patterns.
        
        * Make sure to implement proper test cases that cover both success and error scenarios.
        * Do not do any mocking. Databases are in memory, and integrations have fake implementations. Do not use vitest's mock!
        * Do not test 500 or involve OpenAPI validation. Just success and 400 responses which are handled in the implementation.
        * If a test unexpectedly gets **404** for a route you registered, check that the group is in \`routers.ts\` \`groupRouterMounts()\` and that main \`http.ts\` still mounts platform terminators (\`createCronRouter\`) *after* product barrels.
        * If a test unexpectedly gets **500** with \`"nullable" cannot be used without "type"\`, fix the OpenAPI schema in the adjacent \`-spec\` package (see handler-step guidance), rebuild the spec, and re-run — do not treat it as a handler bug.
        * Run tests with "npm run test" in ${context.cwd}.
        * **Default tier:** mount \`create${kebabCaseToPascalCase(context.groupName)}Router\` (the group \`index.ts\` factory) via \`acquireRouterSlimRouteTest\` from \`test/slim-route-test.ts\`, with \`beforeAll\`/\`afterAll\` and \`releaseSlimRouteTest\` in \`afterAll\`.
        * Do **not** import \`create…HttpApp\` from \`http.ts\` in handler tests — that mounts every product router (slow, heavy imports).
        * Multi-route chains: \`acquireRouterSlimRouteTestMulti([createA, createB])\` or a dedicated \`*.integration.test.ts\` with explicit scope.
        * **Imports:** use package subpath exports (e.g. \`@scope/my-db/queries/<group>/<name>\`, \`@scope/my-service-common/context\`) — never import from a package root or group query barrels. \`./queries/*\` / \`./handlers/*\` cover new files; do not edit \`package.json\` exports when adding handlers.
        * **Shared model fixtures:** Prefer factories from product \`*-test\` packages (\`@scope/<product>-test/factories/*\` for core service models; \`@scope/<product>-<offshoot>-test/factories/*\` and \`provenance/*\` for offshoot models). Do not hand-build large empty objects when a factory exists. Add new factories there when the same shape is needed in more than one test. Prod empties stay on \`*-spec\` (\`empties\`); keep DB/HTTP mount helpers in the package's local \`testing/\` only.
        
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
