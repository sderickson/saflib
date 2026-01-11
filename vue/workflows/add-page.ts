import {
  CopyStepMachine,
  UpdateStepMachine,
  PromptStepMachine,
  defineWorkflow,
  step,
  parsePath,
  type ParsePathOutput,
  makeLineReplace,
  type ParsePackageNameOutput,
  parsePackageName,
  getPackageName,
  CommandStepMachine,
} from "@saflib/workflows";
import path from "node:path";

const pageDir = path.join(
  import.meta.dirname,
  "template/__subdomain-name__/pages/__target-name__",
);
const packageDir = path.join(
  import.meta.dirname,
  "template/__subdomain-name__",
);
const linksDir = path.join(import.meta.dirname, "template", "links");

const input = [
  {
    name: "path",
    description: "Path of the new page (e.g., './pages/welcome-new-user')",
    exampleValue: "./pages/welcome-new-user",
  },
] as const;

interface AddSpaPageWorkflowContext
  extends ParsePathOutput,
    ParsePackageNameOutput {
  targetDir: string;
}

export const AddSpaPageWorkflowDefinition = defineWorkflow<
  typeof input,
  AddSpaPageWorkflowContext
>({
  id: "vue/add-page",

  description:
    "Create a new page in a SAF-powered Vue SPA, using a template and renaming placeholders.",

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) => {
    const targetDir = path.dirname(path.join(input.cwd));
    const subdomainName = path.basename(input.cwd);
    console.log("targetDir", targetDir);
    console.log("subdomain name", subdomainName);
    const pathResult = parsePath(input.path, {
      requiredPrefix: "./pages/",
      cwd: input.cwd,
    });
    if (pathResult.targetName.endsWith("-page")) {
      throw new Error("Target name cannot end with '-page'");
    }
    return {
      ...pathResult,
      ...parsePackageName(getPackageName(input.cwd), {
        silentError: true, // so checklists don't error
        requiredSuffix: ["-spa", "-sdk"],
      }),
      targetDir,
      subdomainName,
    };
  },

  templateFiles: {
    fixture: path.join(pageDir, "__TargetName__Page.fixture.ts"),
    loader: path.join(pageDir, "__TargetName__Page.loader.ts"),
    vue: path.join(pageDir, "__TargetName__Page.vue"),
    async: path.join(pageDir, "__TargetName__PageAsync.vue"),
    strings: path.join(pageDir, "__TargetName__Page.strings.ts"),
    test: path.join(pageDir, "__TargetName__Page.test.ts"),

    fixturesIndex: path.join(packageDir, "fixtures.ts"),
    stringsIndex: path.join(packageDir, "strings.ts"),
    router: path.join(packageDir, "router.ts"),

    linksPackage: linksDir,
  },

  docFiles: {},

  steps: [
    step(CopyStepMachine, ({ context }) => ({
      name: context.targetName,
      targetDir: context.targetDir,
      lineReplace: makeLineReplace(context),
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "vue",
      promptMessage: `Update **${path.basename(context.copiedFiles!.vue)}** to render the page:
      
      * Use the loader file (${path.basename(context.copiedFiles!.loader)}) to add Tanstack queries for any data needed to render the page.
      * Use the strings file (${path.basename(context.copiedFiles!.strings)}) for all user-facing copy.
      * Take the data from the loader, assert that it's loaded, and render the page.
      * Do not add any sort of loading state or skeleton; that's the job of the "Async" component.
      * Don't break reactivity! Render the data directly from the tanstack queries, or if necessary create a computed property.
      * Import and use the "useReverseT" function from the i18n.ts file at the root of the package, and use t(strings.key) instead of strings.key for all text.`,
    })),

    step(
      PromptStepMachine,
      ({ context }) => ({
        promptText: `Find the "links" package adjacent to this package. Add the link for the new page there along with the others. Then update **router.ts** to include the new page:
        
        * Use ${path.basename(context.copiedFiles!.async)}.
        * Use the link from the shared links package instead of hardcoding the path.`,
      }),
      {
        skipIf: ({ context }) => {
          return context.serviceName.endsWith("-sdk");
        },
      },
    ),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "test",
      promptMessage: `Update **${path.basename(context.copiedFiles!.test)}** to verify that the page renders correctly:
      
      * Test that the page renders.
      * Update the helper methods to locate actual key elements of the page, then update the one test to check that they all exist and have the right text.
      * Only use "getElementByString" to locate elements, using the strings from the strings file as the argument.`,
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["run", "test"],
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "fixture",
      promptMessage: `Update **${path.basename(context.copiedFiles!.fixture)}** to implement a Playwright fixture for this page:
      
      * Write a class which has a constructor that takes a Page object and stores it as a readonly public property.
      * Add helper methods for interacting with this page in E2E tests, for the key elements of the page.
      * If the test needs to provide a value for a select option or a checkbox label or something like that, import the strings from the appropriate string file and check the value dynamically, with a helpful error message if the value is invalid.
      * Use getByString from @saflib/playwright to locate elements using strings from the page's strings file.`,
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["run", "typecheck"],
    })),
  ],
});
