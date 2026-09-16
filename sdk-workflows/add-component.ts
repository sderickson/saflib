import path from "node:path";
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
import { templatesProductRoot } from "@saflib/templates";

const sourceDir = path.join(templatesProductRoot, "service", "sdk");

interface AddComponentInput {
  path: string;
}

interface AddComponentContext extends ParsePathOutput, ParsePackageNameOutput {
  targetDir: string;
  prefixName: string;
  fullName: string;
}

/**
 * Ported from `sdk/workflows/add-component.ts`. Two simplifications vs the
 * old file (both already established patterns elsewhere in this port):
 * - The old `input.runMode === "checklist"` branch (fakes a package name so
 *   checklist previews don't need a real `package.json`) is dropped; the new
 *   engine's `context()` builder doesn't receive the run mode, and
 *   `parsePackageName`'s existing `silentError: true` already covers "don't
 *   throw when there's nothing real to validate against".
 * - The second `update` step's old `validate` hook (re-prompt if the
 *   generated test file exceeds 300 lines) has no equivalent — the new
 *   engine's steps have no post-hoc validation/re-prompt option, just
 *   input/run. Dropped; the prompt text's own "keep it short" guidance
 *   remains.
 */
export const AddComponentWorkflowDefinition = defineWorkflow<
  AddComponentInput,
  AddComponentContext
>({
  id: "sdk/add-component",

  description: "Create a new component in the SDK package",

  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description:
          "Path of the new component (e.g., './displays/example-table' or './forms/user-form')",
      },
    },
    required: ["path"],
  },

  context: ({ input, cwd }) => {
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

    if (path.basename(input.path).includes(".")) {
      throw new Error(
        "Path should not include file extensions (just the directory the component files will go in)",
      );
    }

    if (input.path !== input.path.toLowerCase()) {
      throw new Error("Path must be all lowercase");
    }

    const pathResult = parsePath(input.path, { cwd });

    // "full path" of the view, excluding the first directory (displays/, forms/, components/)
    const folderPath = pathResult.groupName + "/" + pathResult.targetName;

    // convert that into a full name usable for variable names
    const fullName = folderPath.split("/").slice(2).join("-").replaceAll("/", "-");

    // Works for both sdk and spa packages: figure out the required suffix
    // from the cwd's own directory name rather than hardcoding "-sdk".
    const dirname = path.basename(cwd);
    const packageName = getPackageName(cwd);
    const dirnameIndex = packageName.indexOf(dirname) - 1;
    const requiredSuffix = packageName.slice(dirnameIndex);

    return {
      ...pathResult,
      ...parsePackageName(packageName, {
        requiredSuffix,
        silentError: true, // so checklists/dry-runs don't error
      }),
      targetDir: cwd,
      prefixName: firstDir,
      fullName,
      groupName: folderPath,
    };
  },

  steps: [
    step<CopyStepInput, AddComponentContext>("copy", runCopyStep, ({ context }) => {
      const defaultLineReplace = makeLineReplace(context);
      const lineReplace = (line: string) => {
        const l = line
          .replace("template-package-sdk/test-app", context.packageName + "/test-app")
          .replace("template-package-sdk/i18n", context.packageName + "/i18n");
        return defaultLineReplace(l);
      };
      return {
        templateFiles: {
          vue: path.join(sourceDir, "__group-name__/__TargetName__.vue"),
          strings: path.join(sourceDir, "__group-name__/__TargetName__.strings.ts"),
          test: path.join(sourceDir, "__group-name__/__TargetName__.test.ts"),
          packageStrings: path.join(sourceDir, "strings.ts"),
        },
        name: context.targetName,
        targetDir: context.targetDir,
        lineReplace,
      };
    }),

    step<UpdateStepInput, AddComponentContext>("update", runUpdateStep, () => ({
      fileId: "vue",
      prompt: `Update the component file to implement the component.

      * The component should take as props some combination of the schemas exported by the adjacent "spec" package.
      * For form components, make a ref for each field in the form, populated with the prop data.
      * Add any strings to the "strings.ts" file, not directly in the component.
      * Do not use any custom styles; use Vuetify components and styling exclusively.
      * Use Vuetify skeletons for loading states.
      * If this is a form, don't use inputs for any uneditable fields. If this is not a form component, don't use input components at all!
      * If the component uses mutations, make sure to use "showError" for network errors.`,
    })),

    step<UpdateStepInput, AddComponentContext>("update", runUpdateStep, () => ({
      fileId: "test",
      prompt: `Update the generated test file to test the component.

      * Make sure to use the dedicated test app, and the getElementByString helper function.
      * You don't really have to mock the server; the component should not load data directly itself. You also don't have to thoroughly test the component; just give it some sample inputs and make sure it renders correctly.
      * For sample props that are OpenAPI/service models, prefer factories from product \`*-test\` packages (\`@scope/<product>-test/factories/*\` / \`@scope/<product>-<offshoot>-test/factories/*\`) instead of hand-built empties.
      * Keep the test short — ideally only one test making sure it renders.
      `,
    })),

    step<CommandStepInput, AddComponentContext>("command", runCommandStep, () => ({
      command: "npm",
      args: ["run", "test"],
    })),

    step<CommandStepInput, AddComponentContext>("command", runCommandStep, () => ({
      command: "npm",
      args: ["run", "typecheck"],
    })),

    step<CommandStepInput, AddComponentContext>("command", runCommandStep, () => ({
      command: "npm",
      args: ["run", "typecheck"],
    })),

    step<CommandStepInput, AddComponentContext>("command", runCommandStep, () => ({
      command: "npm",
      args: ["run", "test"],
    })),
  ],
});

export default AddComponentWorkflowDefinition;
