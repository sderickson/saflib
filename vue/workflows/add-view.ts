import {
  CopyStepMachine,
  UpdateStepMachine,
  defineWorkflow,
  step,
  parsePath,
  type ParsePathOutput,
  makeLineReplace,
  type ParsePackageNameOutput,
  parsePackageName,
  getPackageName,
  CommandStepMachine,
  PromptStepMachine,
} from "@saflib/workflows";
import path from "node:path";

const pageDir = path.join(
  import.meta.dirname,
  "template/__subdomain-name__/__group-name__",
);
const packageDir = path.join(
  import.meta.dirname,
  "template/__subdomain-name__",
);
const linksDir = path.join(import.meta.dirname, "template", "links");

const input = [
  {
    name: "path",
    description:
      "Path of the new page or dialog (e.g., './pages/welcome-new-user')",
    exampleValue: "./pages/welcome-new-user",
  },
] as const;

interface AddSpaViewWorkflowContext
  extends ParsePathOutput,
    ParsePackageNameOutput {
  targetDir: string;
  fullName: string;
}

export const AddSpaViewWorkflowDefinition = defineWorkflow<
  typeof input,
  AddSpaViewWorkflowContext
>({
  id: "vue/add-view",

  description:
    "Create a new page, dialog, or other view in a SAF-powered Vue SPA, using a template and renaming placeholders.",

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) => {
    const targetDir = path.dirname(path.join(input.cwd));
    const subdomainName = path.basename(input.cwd);

    if (
      !input.path.startsWith("./pages/") &&
      !input.path.startsWith("./dialogs/")
    ) {
      throw new Error("Path must start with './pages/' or './dialogs/'");
    }

    const pathResult = parsePath(input.path, {
      cwd: input.cwd,
    });
    if (
      pathResult.targetName.endsWith("-page") ||
      pathResult.targetName.endsWith("-dialog")
    ) {
      throw new Error("Target name cannot end with '-page' or '-dialog'");
    }

    // get the "full path" of the view, which does not include the first directory (pages/ or dialogs/)
    const folderPath = pathResult.groupName + "/" + pathResult.targetName;
    let routePath = folderPath.split("/").slice(2).join("/");
    if (routePath === "home") {
      routePath = "";
    }

    // convert that into a full name that can be used for variable names
    const fullName = folderPath
      .split("/")
      .slice(2)
      .join("-")
      .replaceAll("/", "-");

    return {
      ...pathResult,
      ...parsePackageName(getPackageName(input.cwd), {
        silentError: true, // so checklists don't error
        requiredSuffix: ["-spa", "-sdk"],
      }),
      targetDir,
      subdomainName,
      groupName: folderPath,
      routePath,
      fullName,
    };
  },

  templateFiles: {
    loader: path.join(pageDir, "__TargetName__.loader.ts"),
    vue: path.join(pageDir, "__TargetName__.vue"),
    async: path.join(pageDir, "__TargetName__Async.vue"),
    strings: path.join(pageDir, "__TargetName__.strings.ts"),
    test: path.join(pageDir, "__TargetName__.test.ts"),
    stringsIndex: path.join(packageDir, "strings.ts"),
    router: path.join(packageDir, "router.ts"),

    linksPackage: linksDir,
  },

  docFiles: {
    components: path.join(import.meta.dirname, "../docs", "02-components.md"),
  },

  versionControl: {
    allowPaths: ({ context }) => [`**/${context.groupName.slice(2)}/**`],
  },

  steps: [
    step(CopyStepMachine, ({ context }) => {
      let templateFiles = context.templateFiles;
      if (context.groupName !== "pages") {
        // remove "router.ts" from the template files
        templateFiles = {
          ...templateFiles,
        };
        delete templateFiles.router;
      }

      // bit of a bandaid to replace valid but extraneous import syntax from root level imports
      const defaultLineReplace = makeLineReplace(context);
      const lineReplace = (line: string) => {
        return defaultLineReplace(line).replace("././", "./");
      };
      return {
        name: context.targetName,
        targetDir: context.targetDir,
        lineReplace,
        templateFiles,
      };
    }),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "vue",
      promptMessage: `Update **${path.basename(context.copiedFiles!.vue)}** to render the page:

      * Located at ${context.copiedFiles?.vue}
      * Use the adjacent (${path.basename(context.copiedFiles!.loader)}) to add Tanstack queries for any data needed to render the page (the Tanstack queries are imported from the appropriate sdk package)
      * Use the adjacent (${path.basename(context.copiedFiles!.strings)}) for all user-facing copy.
      * Take the data from the loader, assert that it's loaded, and render the page.
      * Do not add any sort of loading state or skeleton; that's the job of the "Async" component.
      * Don't break reactivity! Render the data directly from the tanstack queries, or if necessary create a computed property.
      * Import and use the "useReverseT" function from the i18n.ts file at the root of the package, and use t(strings.key) instead of strings.key for all text.
      
      For more information, see ${context.docFiles?.components}`,
    })),

    step(PromptStepMachine, ({ context }) => ({
      prompt: `Now that the view is implemented, extract testable logic and write tests.

Review the view and any sub-components you created, then:

## 1. Logic files (\`ComponentName.logic.ts\`)

Extract **pure business logic** from Vue components into plain TypeScript functions.
This includes: validation, data transformation, formatting, building request payloads,
and any computation that doesn't need Vue reactivity or the DOM.

Write unit tests in \`ComponentName.logic.test.ts\` — these should be fast, deterministic,
no-DOM tests that import and call the functions directly.

## 2. Composables (\`useComponentFlow.ts\`)

If a component has **stateful logic involving networking** — TanStack mutations, multi-step
flows (e.g. create → upload → run), state machines, or complex error handling chains —
extract it into a composable. The composable should own the reactive state and mutations,
and expose them to the component.

Write integration tests in \`useComponentFlow.test.ts\` using \`setupMockServer\` with the
SDK's fake handlers and \`withVueQuery\` to test the composable without a DOM.
Import mock data arrays (e.g. \`mockEvals\`, \`mockForms\`) from the SDK's fakes export
to set up and verify backend state.

## 3. After extraction

The Vue components should be **thin** — mostly template + v-model bindings + the composable
call. All interesting logic should be tested independently via the logic and composable tests.

Run \`npm run test\` in ${context.cwd} to verify the tests pass and are sufficiently covered.
Run \`npm run typecheck\` in ${context.cwd} to verify the code is type-safe.

## Important guidelines

* **Strings**: Each sub-component gets its own \`.strings.ts\` file (e.g. \`MyDialog.strings.ts\`).
  Don't pile all strings into the view's strings file. Remember to do this if you opt to break
  a vue file into sub-components.
* **Sub-component interfaces**: Keep them simple. Pass data loaded by the view's loader through
  props. But let sub-components access TanStack queries and mutations **directly** rather than
  threading them through props and events. Only pass data that is already loaded by the view's
  loader; if a sub-component needs to fetch additional data on interaction or fire mutations,
  it should do so itself.
* **Render test**: Update the generated \`${context.targetName}.test.ts\` — replace the TODO
  string with an actual visible string from the rendered page (e.g. the page title). This smoke
  test drives baseline coverage on the Vue file; uncovered lines highlight logic worth extracting.
  Don't add interaction tests here — Playwright covers that. Focus deeper tests on the extracted
  logic files and composables.
* **Deciding What to Test**: Don't extract simple logic just to test it. We already have tests for each tanstack query, so there's no need to pull that into a separate composable either. Save testing for more complex logic.

For more information, see ${context.docFiles?.components}`,
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["run", "test"],
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["run", "typecheck"],
    })),
  ],
});

/**
 * @deprecated Use AddSpaViewWorkflowDefinition instead
 */
export const AddSpaPageWorkflowDefinition = AddSpaViewWorkflowDefinition;
