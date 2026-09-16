import path from "node:path";
import {
  defineWorkflow,
  step,
  stepSkipIf,
  parsePath,
  parsePackageName,
  getPackageName,
  makeLineReplace,
  runCopyStep,
  runUpdateStep,
  runCommandStep,
  runCdStep,
  runCallWorkflowStep,
  type CopyStepInput,
  type UpdateStepInput,
  type CommandStepInput,
  type CdStepInput,
  type CallWorkflowStepInput,
  type ParsePackageNameOutput,
  type ParsePathOutput,
} from "@saflib/new-workflows";
import { kebabCaseToCamelCase, kebabCaseToPascalCase } from "@saflib/utils";
import { templatesProductRoot, templatesSaflibRoot } from "@saflib/templates";
import { ServiceAddStoreWorkflowDefinition } from "@saflib/service-workflows";

const httpRoot = path.join(templatesProductRoot, "service", "http");
const handlerDir = path.join(httpRoot, "handlers", "__group-name__");
const refDoc = path.join(templatesSaflibRoot, "express", "docs", "03-routes.md");
const testingGuide = path.join(templatesSaflibRoot, "express", "docs", "04-testing.md");

interface AddHandlerInput {
  path: string;
  /** Include file upload handling (multipart); shunt file data to a container in the store. */
  upload?: boolean;
  /** Return binary response (e.g. stream/send file from store or generated content). */
  download?: boolean;
}

interface AddHandlerWorkflowContext extends ParsePackageNameOutput, ParsePathOutput {
  cwd: string;
  upload: boolean;
  download: boolean;
  storeName: string;
  operationId: string;
}

/**
 * Ported from `express/workflows/add-handler.ts` — same templates, same
 * prompts, same step order, running on the new sqlite-backed engine
 * instead of XState.
 *
 * The old `makeWorkflowMachine(ServiceAddStoreWorkflowDefinition)` nested
 * call becomes a `call-workflow` step; its `skipIf: !context.upload`
 * (and this workflow has no other conditional steps) becomes `stepSkipIf`
 * — see `new-workflows/lib/conditional-step.ts`.
 */
export const AddHandlerWorkflowDefinition = defineWorkflow<
  AddHandlerInput,
  AddHandlerWorkflowContext
>({
  id: "express/add-handler",

  description:
    "Add a route handler, group router, slim test, and routers.ts mount. Run openapi/route and saf-specs generate first.",

  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Path of the new handler (e.g. './handlers/example-subpath/example-handler.ts')",
      },
      upload: {
        type: "boolean",
        description:
          "Include file upload handling (multipart); shunt file data to a container in the store",
      },
      download: {
        type: "boolean",
        description: "Return binary response (e.g. stream/send file from store or generated content)",
      },
    },
    required: ["path"],
  },

  context: ({ input, cwd }) => {
    const pathResult = parsePath(input.path, {
      requiredSuffix: ".ts",
      cwd,
      requiredPrefix: "./handlers/",
    });
    const storeName = `${pathResult.groupName}-file-container`;
    const operationId =
      kebabCaseToCamelCase(pathResult.targetName.split(".")[0]) +
      kebabCaseToPascalCase(pathResult.groupName);
    return {
      ...parsePackageName(getPackageName(cwd), {
        silentError: true, // so checklists/dry-runs don't error
        requiredSuffix: "-http",
      }),
      ...pathResult,
      cwd,
      storeName,
      operationId,
      upload: input.upload ?? false,
      download: input.download ?? false,
    };
  },

  steps: [
    step<CdStepInput, AddHandlerWorkflowContext>("cd", runCdStep, () => ({
      path: "../common",
    })),

    stepSkipIf<CallWorkflowStepInput, AddHandlerWorkflowContext>(
      ({ context }) => !context.upload,
      "call-workflow",
      runCallWorkflowStep,
      ({ context }) => ({
        targetDefinition: ServiceAddStoreWorkflowDefinition,
        targetInput: { name: `${context.groupName}FileContainer` },
      }),
    ),

    step<CdStepInput, AddHandlerWorkflowContext>("cd", runCdStep, () => ({
      path: ".",
    })),

    step<CopyStepInput, AddHandlerWorkflowContext>("copy", runCopyStep, ({ context }) => {
      const lineReplace = makeLineReplace(context);
      return {
        templateFiles: {
          handler: path.join(handlerDir, "__target-name__.ts"),
          test: path.join(handlerDir, "__target-name__.test.ts"),
          index: path.join(handlerDir, "index.ts"),
          helpers: path.join(handlerDir, "_helpers.ts"),
          // Anchor sharedPrefix at httpRoot so handlers keep handlers/<group>/… paths.
          routers: path.join(httpRoot, "routers.ts"),
        },
        name: context.targetName,
        targetDir: context.cwd,
        flags: { upload: context.upload, download: context.download },
        lineReplace: (line: string) => {
          let out = line;
          out = out.split("@saflib/base-spec").join(`${context.sharedPackagePrefix}-spec`);
          out = out.split("@saflib/base-db").join(`${context.sharedPackagePrefix}-db`);
          out = out
            .split("@saflib/base-service-common")
            .join(`${context.sharedPackagePrefix}-service-common`);
          return lineReplace(out);
        },
      };
    }),

    step<UpdateStepInput, AddHandlerWorkflowContext>("update", runUpdateStep, ({ context }) => ({
      fileId: "handler",
      prompt: `Implement the ${context.targetName} route handler.

      Make sure to:
      - Use createHandler from @saflib/express
      - Import \`RequestBody\` / \`ResponseBody\` from \`@…-spec/operations/${context.operationId}\` (per-operation fragments — not a root barrel type)
      - Use mapper functions from handlers/_helpers.ts to convert database models to API responses
      - Import types from both the adjacent spec and db packages; don't declare new ones
      - Handle expected errors from service/DB layers, with "satisfies never" for exhaustive error handling
      - Let unexpected errors propagate to central error handler (no try/catch!)
      - Follow the pattern in the reference doc
      - Wire the handler in the adjacent \`index.ts\` using **per-operation** OpenAPI fragments (see below).
      - Include db -> http mapper functions in the adjacent _helpers.ts file.
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

      Review ${refDoc} for more details.`,
    })),

    step<UpdateStepInput, AddHandlerWorkflowContext>("update", runUpdateStep, ({ context }) => ({
      fileId: "test",
      prompt: `Update the generated ${context.targetName}.test.ts file following the testing guide patterns.

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

        Review ${testingGuide} for more details.`,
    })),

    step<CommandStepInput, AddHandlerWorkflowContext>("command", runCommandStep, () => ({
      command: "npm",
      args: ["run", "typecheck"],
    })),

    step<CommandStepInput, AddHandlerWorkflowContext>("command", runCommandStep, () => ({
      command: "npm",
      args: ["run", "test"],
    })),
  ],
});

export default AddHandlerWorkflowDefinition;
