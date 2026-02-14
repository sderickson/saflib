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
  extends ParsePathOutput, ParsePackageNameOutput {
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
    // fixture: path.join(pageDir, "__TargetName__.fixture.ts"),
    loader: path.join(pageDir, "__TargetName__.loader.ts"),
    vue: path.join(pageDir, "__TargetName__.vue"),
    async: path.join(pageDir, "__TargetName__Async.vue"),
    strings: path.join(pageDir, "__TargetName__.strings.ts"),
    // test: path.join(pageDir, "__TargetName__.test.ts"),

    // fixturesIndex: path.join(packageDir, "fixtures.ts"),
    stringsIndex: path.join(packageDir, "strings.ts"),
    router: path.join(packageDir, "router.ts"),

    linksPackage: linksDir,
  },

  docFiles: {
    components: path.join(import.meta.dirname, "../docs", "02-components.md"),
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

    // step(UpdateStepMachine, ({ context }) => ({
    //   fileId: "test",
    //   promptMessage: `Update **${path.basename(context.copiedFiles!.test)}** to verify that the page renders correctly:

    //   * Test that the page renders.
    //   * Update the helper methods to locate actual key elements of the page, then update the one test to check that they all exist and have the right text.
    //   * Only use "getElementByString" to locate elements, using the strings from the strings file as the argument.`,
    // })),

    // step(CommandStepMachine, () => ({
    //   command: "npm",
    //   args: ["run", "test"],
    // })),

    // step(UpdateStepMachine, ({ context }) => ({
    //   fileId: "fixture",
    //   promptMessage: `Update **${path.basename(context.copiedFiles!.fixture)}** to implement a Playwright fixture for this page:

    //   * Write a class which has a constructor that takes a Page object and stores it as a readonly public property.
    //   * Add helper methods for interacting with this page in E2E tests, for the key elements of the page.
    //   * If the test needs to provide a value for a select option or a checkbox label or something like that, import the strings from the appropriate string file and check the value dynamically, with a helpful error message if the value is invalid.
    //   * Use getByString from @saflib/playwright to locate elements using strings from the page's strings file.`,
    // })),

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
