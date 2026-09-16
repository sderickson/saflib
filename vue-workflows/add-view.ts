import path from "node:path";
import {
  defineWorkflow,
  step,
  parsePath,
  parsePackageName,
  getPackageName,
  runCopyStep,
  runUpdateStep,
  runPromptStep,
  runCommandStep,
  type CopyStepInput,
  type UpdateStepInput,
  type PromptStepInput,
  type CommandStepInput,
  type ParsePathOutput,
  type ParsePackageNameOutput,
} from "@saflib/new-workflows";
import { kebabCaseToPascalCase } from "@saflib/utils";
import { templatesSaflibRoot } from "@saflib/templates";
import { clientsRoot, linksStub, makeBasePackageLineReplace } from "./shared.ts";

const spaStubDir = path.join(clientsRoot, "__subdomain-name__");
const pageDir = path.join(spaStubDir, "__group-name__");
/** Live SPA area hosts — CopyStep upserts stub lines. */
const packageDir = spaStubDir;

const loaderTemplate = path.join(pageDir, "__TargetName__.loader.ts");
const vueTemplate = path.join(pageDir, "__TargetName__.vue");
const asyncTemplate = path.join(pageDir, "__TargetName__Async.vue");
const stringsTemplate = path.join(pageDir, "__TargetName__.strings.ts");
const fixtureTemplate = path.join(pageDir, "__TargetName__.fixture.ts");
const stringsIndexLive = path.join(packageDir, "strings.ts");
const routerLive = path.join(packageDir, "router.ts");

const componentsDoc = path.join(templatesSaflibRoot, "vue", "docs", "02-components.md");
const i18nDoc = path.join(templatesSaflibRoot, "vue", "docs", "03-i18n.md");

interface AddViewInput {
  path: string;
  urlPath: string;
  /** What the view should actually render/do, e.g. "list todos, with a form to create new ones". */
  prompt?: string;
}

interface AddViewWorkflowContext extends ParsePathOutput, ParsePackageNameOutput {
  cwd: string;
  targetDir: string;
  fullName: string;
  subdomainName: string;
  prompt?: string;
}

/**
 * Ported from `vue/workflows/add-view.ts` — same templates, same prompts,
 * same step order, running on the new sqlite-backed engine instead of
 * XState.
 *
 * The old copy step read `context.templateFiles` (the workflow-definition-
 * level map exposed on the built context) to conditionally drop the
 * `router` entry for dialogs — the new engine's `context: C` has no such
 * field, so the template file map is built inline in the `copy` step's own
 * `input()` builder instead, with the same conditional `delete`.
 */
export const AddSpaViewWorkflowDefinition = defineWorkflow<AddViewInput, AddViewWorkflowContext>({
  id: "vue/add-view",

  description:
    "Create a new page, dialog, or other view in a SAF-powered Vue SPA, using a template and renaming placeholders.",

  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Folder path of the new page or dialog (e.g., './pages/welcome-new-user')",
      },
      urlPath: {
        type: "string",
        description: "The URL path for the view (e.g., '/recipes/:id' or '/recipes/create')",
      },
      prompt: {
        type: "string",
        description:
          "What the view should actually render/do, e.g. 'list todos, with a form to create new ones'. Passed to the agent implementing it.",
      },
    },
    required: ["path", "urlPath"],
  },

  context: ({ input, cwd }) => {
    const targetDir = path.dirname(path.join(cwd));
    const subdomainName = path.basename(cwd);

    if (!input.path.startsWith("./pages/") && !input.path.startsWith("./dialogs/")) {
      throw new Error("Path must start with './pages/' or './dialogs/'");
    }

    const pathResult = parsePath(input.path, { cwd });
    if (pathResult.targetName.endsWith("-page") || pathResult.targetName.endsWith("-dialog")) {
      throw new Error("Target name cannot end with '-page' or '-dialog'");
    }

    // get the "full path" of the view, which does not include the first directory (pages/ or dialogs/)
    const folderPath = pathResult.groupName + "/" + pathResult.targetName;

    // convert that into a full name that can be used for variable names
    const fullName = folderPath.split("/").slice(2).join("-").replaceAll("/", "-");

    return {
      ...pathResult,
      ...parsePackageName(getPackageName(cwd), {
        silentError: true, // so checklists/dry-runs don't error
        requiredSuffix: ["-spa", "-sdk"],
      }),
      cwd,
      targetDir,
      subdomainName,
      groupName: folderPath,
      urlPath: input.urlPath.slice(1),
      fullName,
      prompt: input.prompt,
    };
  },

  steps: [
    step<CopyStepInput, AddViewWorkflowContext>("copy", runCopyStep, ({ context }) => {
      const templateFiles: Record<string, string> = {
        loader: loaderTemplate,
        vue: vueTemplate,
        async: asyncTemplate,
        strings: stringsTemplate,
        fixture: fixtureTemplate,
        stringsIndex: stringsIndexLive,
        router: routerLive,
        links: linksStub,
      };
      // Only pages get a router entry; dialogs stay out of the SPA route table.
      // groupName keeps the leading `./` from parsePath (e.g. `./pages/foo`).
      const viewKind = context.groupName.replace(/^\.\//, "");
      if (!viewKind.startsWith("pages/") && viewKind !== "pages") {
        delete templateFiles.router;
      }

      const productPrefix = context.sharedPackagePrefix.replace(
        new RegExp(`-${context.subdomainName}$`),
        "",
      );
      const linksPackageName = `${productPrefix}-links`;
      const commonPackageName = `${productPrefix}-clients-common`;
      // sharedPackagePrefix is like @org/product-app; product name is last segment without spa subdomain.
      const productName = productPrefix.includes("/") ? productPrefix.split("/").pop()! : productPrefix;

      const lineReplace = makeBasePackageLineReplace({
        ...context,
        productName,
        commonPackageName,
        linksPackageName,
        spaPackageName: context.packageName,
      });
      const wrappedLineReplace = (line: string) => lineReplace(line).replace("././", "./");
      return {
        templateFiles,
        name: context.targetName,
        targetDir: context.targetDir,
        lineReplace: wrappedLineReplace,
      };
    }),

    step<UpdateStepInput, AddViewWorkflowContext>("update", runUpdateStep, ({ context }) => {
      const pascalName = kebabCaseToPascalCase(context.targetName);
      return {
        fileId: "vue",
        prompt: `${context.prompt ? `Task: ${context.prompt}\n\n` : ""}Update **${pascalName}.vue** to render the page:

      * Use the adjacent (${pascalName}.loader.ts) to add Tanstack queries for any data needed to render the page (the Tanstack queries are imported from the appropriate sdk package)
      * Use the adjacent (${pascalName}.strings.ts) for all user-facing copy. Keep \`documentTitle\` in that file for the browser tab (the Async component already wires it via \`useAsyncPageDocumentTitle\`).
      * Take the data from the loader, assert that it's loaded, and render the page.
      * Do not add any sort of loading state or skeleton; that's the job of the "Async" component (and \`AsyncPage\` for query errors). Sub-components should receive **values to render** (e.g. lists, labels), not query \`isPending\`/\`isError\` or raw query objects—unless you have deliberately split loading (JIT) and documented it.
      * Don't break reactivity! Render the data directly from the tanstack queries, or if necessary create a computed property.
      * Import and use the "useReverseT" function from this SPA's \`i18n\` package export (not a relative \`../i18n\`), and use t(strings.key) instead of strings.key for all text. If copy needs runtime values, use vue-i18n placeholders in the string (\`{name}\`, not \`{{name}}\`) and call \`t(strings.key, { name: value })\` — see **Interpolation** in ${i18nDoc}.

      For more information, see ${componentsDoc} and ${i18nDoc}.`,
      };
    }),

    step<PromptStepInput, AddViewWorkflowContext>("prompt", runPromptStep, () => ({
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

When tests need OpenAPI/service model objects (packets, dossier rows, resources, etc.), import
factories from product \`*-test\` packages (\`@scope/<product>-test/factories/*\` for core models;
\`@scope/<product>-<offshoot>-test/factories/*\` and \`provenance/*\` for offshoot models). Do not
hand-build large empty objects when a factory exists; add factories to those packages when the
same shape is needed in more than one test. Prod empties stay on \`*-spec\`; SPA-local
\`testing/\` / \`test-app.ts\` stay for mount helpers only.

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

Run \`npm run test\` to verify the tests pass and are sufficiently covered.
Run \`npm run typecheck\` to verify the code is type-safe.

## Important guidelines

* **Strings**: Each sub-component gets its own \`.strings.ts\` file (e.g. \`MyDialog.strings.ts\`).
  Don't pile all strings into the view's strings file. Remember to do this if you opt to break
  a vue file into sub-components. Interpolation in \`.strings.ts\` must use vue-i18n form:
  \`{placeholder}\` in the English string and \`t(strings.key, { placeholder: value })\` in the
  component — never \`{{placeholder}}\` (breaks message compilation in production builds).
  Root \`strings.ts\` is for i18n registration only — keep upserting there; do **not** add a
  root \`fixtures.ts\` barrel. Playwright imports the co-located \`*.fixture.ts\` via the SPA
  package glob (e.g. \`@scope/pkg/pages/.../Page.fixture.ts\`).
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

For more information, see ${componentsDoc} and ${i18nDoc}.`,
    })),

    step<PromptStepInput, AddViewWorkflowContext>("prompt", runPromptStep, () => ({
      prompt: `## Import graph / SPA bundles

New routes appear automatically in \`saf-imports spa analyze\`. Refresh bundle metrics in a local snapshot only if this route adds a materially heavy page chunk (not every add-view):

\`\`\`bash
npm exec saf-imports snapshot generate --out <product>/plans/notes/import-graph/snapshot.json --skip-timings
\`\`\`

See saflib/imports/docs/06-spa-bundles.md.`,
    })),

    step<CommandStepInput, AddViewWorkflowContext>("command", runCommandStep, () => ({
      command: "npm",
      args: ["run", "test"],
    })),

    step<CommandStepInput, AddViewWorkflowContext>("command", runCommandStep, () => ({
      command: "npm",
      args: ["run", "typecheck"],
    })),
  ],
});

/**
 * @deprecated Use AddSpaViewWorkflowDefinition instead
 */
export const AddSpaPageWorkflowDefinition = AddSpaViewWorkflowDefinition;

export default AddSpaViewWorkflowDefinition;
