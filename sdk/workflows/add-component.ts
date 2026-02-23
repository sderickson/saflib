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
import { readFileSync } from "node:fs";
import path from "node:path";

const sourceDir = path.join(import.meta.dirname, "templates");

const input = [
  {
    name: "path",
    description:
      "Path of the new component (e.g., './displays/example-table' or './forms/user-form')",
    exampleValue: "./displays/example-table",
  },
] as const;

interface AddComponentWorkflowContext
  extends ParsePathOutput,
    ParsePackageNameOutput {
  targetDir: string;
  prefixName: string;
  fullName: string;
}

export const AddComponentWorkflowDefinition = defineWorkflow<
  typeof input,
  AddComponentWorkflowContext
>({
  id: "sdk/add-component",

  description: "Create a new component in the SDK package",

  checklistDescription: ({ targetName }) =>
    `Create a new ${targetName} component.`,

  input,

  sourceUrl: import.meta.url,

  context: ({ input }) => {
    // Validate the path format
    if (
      !input.path.startsWith("./displays/") &&
      !input.path.startsWith("./forms/") &&
      !input.path.startsWith("./components/")
    ) {
      throw new Error(
        "Path must start with './displays/' or './forms/' or './components/'",
      );
    }
    const firstDir = `./${input.path.split("/")[1]}/`;

    // Validate component name (no extension, all lowercase)
    if (path.basename(input.path).includes(".")) {
      throw new Error(
        "Path should not include file extensions (just the directory the component files will go in)",
      );
    }

    if (input.path !== input.path.toLowerCase()) {
      throw new Error("Path must be all lowercase");
    }

    const pathResult = parsePath(input.path, {
      cwd: input.cwd,
    });

    // get the "full path" of the view, which does not include the first directory (pages/ or dialogs/)
    const folderPath = pathResult.groupName + "/" + pathResult.targetName;

    // convert that into a full name that can be used for variable names
    const fullName = folderPath
      .split("/")
      .slice(2)
      .join("-")
      .replaceAll("/", "-");

    // this is all to make add-component work for sdk and spa packages
    // have to look at the context to figure out what the required suffix is
    const dirname = path.basename(input.cwd);
    let packageName = getPackageName(input.cwd);
    const dirnameIndex = packageName.indexOf(dirname) - 1;
    let requiredSuffix = packageName.slice(dirnameIndex);
    if (input.runMode === "checklist") {
      packageName = "template-package-sdk";
      requiredSuffix = "-sdk";
    }

    return {
      ...pathResult,
      ...parsePackageName(getPackageName(input.cwd), {
        requiredSuffix: requiredSuffix,
        silentError: true, // so checklists don't error
      }),
      targetDir: input.cwd,
      prefixName: firstDir,
      fullName,
      groupName: folderPath,
    };
  },

  templateFiles: {
    vue: path.join(sourceDir, "__group-name__/__TargetName__.vue"),
    strings: path.join(sourceDir, "__group-name__/__TargetName__.strings.ts"),
    test: path.join(sourceDir, "__group-name__/__TargetName__.test.ts"),
    packageStrings: path.join(sourceDir, "strings.ts"),
  },

  // TODO: add documentation file references
  docFiles: {},

  steps: [
    step(CopyStepMachine, ({ context }) => {
      const defaultLineReplace = makeLineReplace(context);
      const lineReplace = (line: string) => {
        let l = line
          .replace(
            "template-package-sdk/test-app",
            context.packageName + "/test-app",
          )
          .replace("template-package-sdk/i18n", context.packageName + "/i18n");
        return defaultLineReplace(l);
      };
      return {
        name: context.targetName,
        targetDir: context.targetDir,
        lineReplace,
      };
    }),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "vue",
      promptMessage: `Update **${path.basename(context.copiedFiles!.vue)}** to implement the component.

      * The component should take as props some combination of the schemas exported by the adjacent "spec" package.
      * For form components, make a ref for each field in the form, populated with the prop data.
      * Add any strings to the "strings.ts" file, not directly in the component.
      * Do not use any custom styles; use Vuetify components and styling exclusively.
      * Use Vuetify skeletons for loading states.
      * If this is a form, don't use inputs for any uneditable fields. If this is not a form component, don't use input components at all!
      * If the component uses mutations, make sure to use "showError" for network errors.`,
    })),

    step(
      UpdateStepMachine,
      ({ context }) => ({
        fileId: "test",
        promptMessage: `Update **${path.basename(context.copiedFiles!.test)}** to test the component.
      
      * Make sure to use the dedicated test app, and the getElementByString helper function.
      * You don't really have to mock the server; the component should not load data directly itself. You also don't have to thoroughly test the component; just give it some sample inputs and make sure it renders correctly.
      `,
      }),
      {
        validate: async ({ context }) => {
          const content = readFileSync(context.copiedFiles!.test, "utf-8");
          const testLength = content.split("\n").length;
          if (testLength > 300) {
            return `Test file is too long at ${testLength} lines. Component tests should be short, ideally only one test making sure it renders. Look for ways to simplify the test.`;
          }
          return Promise.resolve(undefined);
        },
      },
    ),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["run", "test"],
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["run", "typecheck"],
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
