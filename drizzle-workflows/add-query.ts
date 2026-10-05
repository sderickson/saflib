import path from "node:path";
import { existsSync } from "node:fs";
import {
  defineWorkflow,
  step,
  parsePath,
  parsePackageName,
  getPackageName,
  makeLineReplace,
  runCopyStep,
  runUpdateStep,
  runCommandStep,
  type CopyStepInput,
  type UpdateStepInput,
  type CommandStepInput,
  type ParsePathOutput,
  type ParsePackageNameOutput,
} from "@saflib/new-workflows";
import { templatesProductRoot, templatesSaflibRoot } from "@saflib/templates";

const dbRoot = path.join(templatesProductRoot, "service", "db");
const queryDir = path.join(dbRoot, "queries", "__group-name__");
/** Anchors sharedPrefix at db/ (package already has these from product/init). */
const typesLive = path.join(dbRoot, "types.ts");
const errorsLive = path.join(dbRoot, "errors.ts");
// `templatesSaflibRoot`, not `import.meta.dirname` — this module can be
// loaded from a container's baked copy of saflib (e.g. dev-site-docker)
// while the docs it should point at live in the *bind-mounted* checkout
// dev-site actually operates on. `@saflib/templates` already resolves that
// distinction via the SAFLIB_ROOT env override; reuse it instead of
// re-deriving a self-relative path here.
const refDoc = path.join(templatesSaflibRoot, "drizzle", "docs", "03-queries.md");

interface AddDrizzleQueryInput {
  path: string;
  /** What the query should actually do, e.g. "list all users ordered by name". */
  prompt?: string;
}

interface AddDrizzleQueryContext extends ParsePathOutput, ParsePackageNameOutput {
  cwd: string;
  prompt?: string;
}

/**
 * Ported from `drizzle/workflows/add-query.ts` — same templates, same
 * prompts, same step order, running on the new sqlite-backed engine
 * instead of XState. `input` is now a plain object (per `inputSchema`)
 * instead of the old `WorkflowArgument[]` array.
 */
export const AddDrizzleQueryWorkflowDefinition = defineWorkflow<
  AddDrizzleQueryInput,
  AddDrizzleQueryContext
>({
  id: "drizzle/add-query",

  description: "Add a new query to a database built off the drizzle-sqlite3 package.",

  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Path of the new query (e.g. './queries/contacts/get-by-id.ts')",
      },
      prompt: {
        type: "string",
        description:
          "What the query should actually do, e.g. 'list all users ordered by name'. Passed to the agent implementing it.",
      },
    },
    required: ["path"],
  },

  context: ({ input, cwd }) => {
    let packageName = "@mock/package-db";
    if (existsSync(path.join(cwd, "package.json"))) {
      packageName = getPackageName(cwd);
    }
    return {
      ...parsePackageName(packageName, {
        requiredSuffix: "-db",
        silentError: true, // so checklists/dry-runs don't error
      }),
      ...parsePath(input.path, {
        requiredPrefix: "./queries/",
        requiredSuffix: ".ts",
        cwd,
      }),
      cwd,
      prompt: input.prompt,
    };
  },

  steps: [
    step<CopyStepInput, AddDrizzleQueryContext>("copy", runCopyStep, ({ context }) => ({
      templateFiles: {
        query: path.join(queryDir, "__target-name__.ts"),
        test: path.join(queryDir, "__target-name__.test.ts"),
        types: typesLive,
        errors: errorsLive,
      },
      name: context.targetName,
      targetDir: context.cwd,
      // Keep `baseDbManager` / `baseDb` — packages export those names even
      // after product/offshoot init (only package names are remapped).
      lineReplace: makeLineReplace(context),
    })),

    step<UpdateStepInput, AddDrizzleQueryContext>("update", runUpdateStep, ({ context }) => ({
      fileId: "query",
      prompt: `${context.prompt ? `Task: ${context.prompt}\n\n` : ""}Implement the new query following the documentation guidelines.

* As much as possible, types should be based on the types that drizzle provides.
* A resource not being found by ID is an error.
* Error subclasses should be simple, no special constructors or anything.
* You don't need to export error types from the types.ts file.
* Import query functions via package subpaths from leaf files only: \`@scope/my-db/queries/<group>/<name>\` (\`./queries/*\` maps to \`./queries/*.ts\` — do not use bare \`queries/<group>\` or group \`index\` barrels).
* New folders and files are covered by \`./queries/*\` — do not edit \`package.json\` exports when adding queries.
* Do not create or update a group \`index.ts\` barrel; consumers import leaf query functions directly.
Please reference the documentation here for more information: ${refDoc}`,
    })),

    step<CommandStepInput, AddDrizzleQueryContext>("command", runCommandStep, () => ({
      command: "npm",
      args: ["run", "typecheck"],
    })),

    step<UpdateStepInput, AddDrizzleQueryContext>("update", runUpdateStep, ({ context }) => ({
      fileId: "test",
      prompt: `${context.prompt ? `The query implements: ${context.prompt}\n\n` : ""}Implement the generated test file.

Aim for 100% coverage; there should be a known way to achieve every handled error. If it's not possible to cause a returned error, it should not be in the implementation.

Prefer factories from product \`*-test\` packages when asserting against OpenAPI/service model shapes (\`@scope/<product>-test/factories/*\`, offshoot \`@scope/<product>-<offshoot>-test/factories/*\`). Do not hand-build large empty objects when a factory exists; add one to the appropriate \`*-test\` package if the same shape is reused.

Please reference the documentation here for more information: ${refDoc}`,
    })),

    step<CommandStepInput, AddDrizzleQueryContext>("command", runCommandStep, () => ({
      command: "npm",
      args: ["run", "typecheck"],
      errorPrompt: `You may have forgotten to provide all fields necessary. Do NOT decouple the types from the inferred types in types.ts. Instead fix the test.`,
    })),

    step<CommandStepInput, AddDrizzleQueryContext>("command", runCommandStep, () => ({
      command: "npm",
      args: ["run", "test"],
    })),
  ],
});

export default AddDrizzleQueryWorkflowDefinition;
