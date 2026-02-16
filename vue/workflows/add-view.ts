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
    loader: path.join(pageDir, "__TargetName__.loader.ts"),
    vue: path.join(pageDir, "__TargetName__.vue"),
    async: path.join(pageDir, "__TargetName__Async.vue"),
    strings: path.join(pageDir, "__TargetName__.strings.ts"),
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
      promptText: `Example usage of ${context.targetName}`, // hey agent, update this!
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
