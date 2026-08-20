import {
  CopyStepMachine,
  UpdateStepMachine,
  defineWorkflow,
  step,
  parsePath,
  type ParsePathOutput,
  type ParsePackageNameOutput,
  parsePackageName,
  getPackageName,
  CommandStepMachine,
  PromptStepMachine,
} from "@saflib/workflows";
import path from "node:path";
import { clientsRoot, linksStub, makeBasePackageLineReplace } from "./shared.ts";

const spaStubDir = path.join(clientsRoot, "__subdomain-name__");
const pageDir = path.join(spaStubDir, "__group-name__");
/** Live SPA area hosts — CopyStep upserts stub lines. */
const packageDir = spaStubDir;

const input = [
  {
    name: "path",
    description:
      "Folder path of the new page or dialog (e.g., './pages/welcome-new-user')",
    exampleValue: "./pages/welcome-new-user",
  },
  {
    name: "urlPath",
    description:
      "The URL path for the view (e.g., '/recipes/:id' or '/recipes/create')",
    exampleValue: "/welcome-new-user",
  },
] as const;

interface AddSpaViewWorkflowContext
  extends ParsePathOutput,
    ParsePackageNameOutput {
  targetDir: string;
  fullName: string;
  subdomainName: string;
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
      urlPath: input.urlPath.slice(1),
      fullName,
    };
  },

  templateFiles: {
    loader: path.join(pageDir, "__TargetName__.loader.ts"),
    vue: path.join(pageDir, "__TargetName__.vue"),
    async: path.join(pageDir, "__TargetName__Async.vue"),
    strings: path.join(pageDir, "__TargetName__.strings.ts"),
    fixture: path.join(pageDir, "__TargetName__.fixture.ts"),
    stringsIndex: path.join(packageDir, "strings.ts"),
    fixturesIndex: path.join(packageDir, "fixtures.ts"),
    router: path.join(packageDir, "router.ts"),
    links: linksStub,
  },

  docFiles: {
    components: path.join(import.meta.dirname, "../docs", "02-components.md"),
    i18n: path.join(import.meta.dirname, "../docs", "03-i18n.md"),
  },

  versionControl: {
    allowPaths: ({ context }) => [`**/${context.groupName.slice(2)}/**`],
  },

  steps: [
    step(CopyStepMachine, ({ context }) => {
      let templateFiles = context.templateFiles;
      // Only pages get a router entry; dialogs stay out of the SPA route table.
      if (
        !context.groupName.startsWith("pages/") &&
        context.groupName !== "pages"
      ) {
        templateFiles = { ...templateFiles };
        delete templateFiles.router;
      }

      const productPrefix = context.sharedPackagePrefix.replace(
        new RegExp(`-${context.subdomainName}$`),
        "",
      );
      const linksPackageName = `${productPrefix}-links`;
      const commonPackageName = `${productPrefix}-clients-common`;
      // sharedPackagePrefix is like @org/product-app; product name is last segment without spa subdomain.
      const productName =
        productPrefix.includes("/")
          ? productPrefix.split("/").pop()!
          : productPrefix;

      const lineReplace = makeBasePackageLineReplace({
        ...context,
        productName,
        commonPackageName,
        linksPackageName,
        spaPackageName: context.packageName,
      });
      const wrappedLineReplace = (line: string) =>
        lineReplace(line).replace("././", "./");
      return {
        name: context.targetName,
        targetDir: context.targetDir,
        lineReplace: wrappedLineReplace,
        templateFiles,
      };
    }),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "vue",
      promptMessage: `Update **${path.basename(context.copiedFiles!.vue)}** to render the page:

      * Located at ${context.copiedFiles?.vue}
      * Use the adjacent (${path.basename(context.copiedFiles!.loader)}) to add Tanstack queries for any data needed to render the page (the Tanstack queries are imported from the appropriate sdk package)
      * Use the adjacent (${path.basename(context.copiedFiles!.strings)}) for all user-facing copy. Keep \`documentTitle\` in that file for the browser tab (the Async component already wires it via \`useAsyncPageDocumentTitle\`).
      * Take the data from the loader, assert that it's loaded, and render the page.
      * Do not add any sort of loading state or skeleton; that's the job of the "Async" component (and \`AsyncPage\` for query errors). Sub-components should receive **values to render** (e.g. lists, labels), not query \`isPending\`/\`isError\` or raw query objects—unless you have deliberately split loading (JIT) and documented it.
      * Don't break reactivity! Render the data directly from the tanstack queries, or if necessary create a computed property.
      * Import and use the "useReverseT" function from this SPA's \`i18n\` package export (not a relative \`../i18n\`), and use t(strings.key) instead of strings.key for all text. If copy needs runtime values, use vue-i18n placeholders in the string (\`{name}\`, not \`{{name}}\`) and call \`t(strings.key, { name: value })\` — see **Interpolation** in ${context.docFiles?.i18n}.
      
      For more information, see ${context.docFiles?.components} and ${context.docFiles?.i18n}.`,
    })),

    step(PromptStepMachine, ({ context }) => ({
      prompt: `Now that the view is implemented, extract sub-components, testable logic, and composables, and write tests.

Review the view you worked on, then break out:

## 0. Sub-components (\`ComponentName.vue\`)

Extract sub-components from the view. Sub-components should be small, focused components that are used to render a part of the view. They should be in the same directory as the view.

**Important**: Sub-components should have simple prop interfaces — pass **data needed to render** (resolved values from the loader: models, arrays, strings) and simple display state (booleans, IDs). Do **not** pass query loading/error flags for loader-owned data (\`AsyncPage\` already gates the route on the loader). Do **not** pass TanStack **mutations** as props; the child calls \`useMutation\` / a composable **directly** in its own \`<script setup>\` (button \`:loading\` from that mutation is fine—it is not the same as page fetch loading). Do not receive flow objects or mutation callbacks through props. This keeps parent-child interfaces clean and avoids awkward ref-unwrapping in templates.

## 1. Logic files (\`ComponentName.logic.ts\`)

Extract **pure business logic** from Vue components into plain TypeScript functions.
This includes: validation, data transformation, formatting, building request payloads,
and any computation that doesn't need Vue reactivity or the DOM.

Write unit tests in \`ComponentName.logic.test.ts\` — these should be fast, deterministic,
no-DOM tests that import and call the functions directly.

Hint: you can group all validation in one function, rather than one per loader query.

## 2. Composables (\`useComponentFlow.ts\`)

If a component has **stateful logic involving networking** — TanStack mutations, multi-step
flows (e.g. create → upload → run), state machines, or complex error handling chains —
extract it into a composable. The composable should own the reactive state and mutations,
and expose them to the component.

Write integration tests in \`useComponentFlow.test.ts\` using \`setupMockServer\` with the
SDK's fake handlers and \`withVueQuery\` to test the composable without a DOM.
Import mock data arrays (e.g. \`mockEvals\`, \`mockForms\`) from the SDK's fakes export
to set up and verify backend state. See the SDK itself for examples of composable tests.

## After extraction

The Vue components should be **thin** — mostly template + v-model bindings + the composable
call. All interesting logic should be tested independently via the logic and composable tests.

Run \`npm run test\` in ${context.cwd} to verify the tests pass and are sufficiently covered.
Run \`npm run typecheck\` in ${context.cwd} to verify the code is type-safe.

## Important guidelines

* **Strings**: Each sub-component gets its own \`.strings.ts\` file (e.g. \`MyDialog.strings.ts\`).
  Don't pile all strings into the view's strings file. Remember to do this if you opt to break
  a vue file into sub-components. Interpolation in \`.strings.ts\` must use vue-i18n form:
  \`{placeholder}\` in the English string and \`t(strings.key, { placeholder: value })\` in the
  component — never \`{{placeholder}}\` (breaks message compilation in production builds).
* **Sub-component interfaces**: Keep them simple. Props = **render data** from the loader (plain
  values) + simple display state (booleans, IDs). Omit loader query **loading/errors** for that
  data—the \`*Async\` page owns fetch UX. Omit **mutation instances** passed from parents; the
  child imports mutations or a small composable instead. Sub-components should call composables and
  TanStack mutations **directly** in their own \`<script setup>\` rather than receiving flow
  objects, refs, or mutation callbacks through props. This avoids ref-unwrapping issues in
  templates and keeps parent-child interfaces focused on **what to render**, not
  **how to orchestrate** (except local mutation wiring, which stays inside the child).
* **Component tests**: Do **not** add render-only smoke tests (\`PageName.test.ts\` that only mount and assert visible copy). Test extracted \`.logic.ts\` and \`use*.ts\` composables instead. Use Playwright for full page flows and navigation. Add a component test only when it exercises **behavior** (clicks, emits, route changes) that is awkward to cover in E2E.
* **Deciding What to Test**: Don't extract simple logic just to test it. We already have tests for each tanstack query, so there's no need to pull that into a separate composable either. Save testing for more complex logic, for example when multiple or tanstack queries are used together.
* **When NOT to extract a composable**: A single mutation + local UI state (e.g. edit form + one save, delete + redirect) can stay in the component. Composables are for multi-step or shared flows.

For more information, see ${context.docFiles?.components} and ${context.docFiles?.i18n}.`,
    })),

    step(PromptStepMachine, () => ({
      prompt: `## Import graph / SPA bundles

New routes appear automatically in \`saf-imports spa analyze\`. Refresh bundle metrics in a local snapshot only if this route adds a materially heavy page chunk (not every add-view):

\`\`\`bash
npm exec saf-imports snapshot generate --out <product>/plans/notes/import-graph/snapshot.json --skip-timings
\`\`\`

See saflib/imports/docs/06-spa-bundles.md.`,
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
