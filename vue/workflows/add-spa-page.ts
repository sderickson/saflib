import { setup, type AnyStateMachine, type InputFrom } from "xstate";
import {
  CopyTemplateMachine,
  UpdateStepMachine,
  PromptStepMachine,
  makeWorkflowMachine,
  Step,
} from "@saflib/workflows";
import { kebabCaseToPascalCase } from "@saflib/utils";
import path from "node:path";
import { fileURLToPath } from "node:url";

const input = [
  {
    name: "name",
    description: "Name of the new page in kebab-case (e.g. 'welcome-new-user')",
    exampleValue: "example-page",
  },
] as const;

const sourceDir = path.join(__dirname, "page-template");

const defineSteps = <C>(
  steps: Array<Step<C, AnyStateMachine>>,
): Array<Step<C, AnyStateMachine>> => {
  return steps;
};

const defineStep = <C, M extends AnyStateMachine>(
  machine: M,
  input: (arg: { context: C }) => InputFrom<M>,
): Step<C, M> => {
  return {
    machine,
    input,
  };
};

interface AddSpaPageWorkflowContext {
  name: string;
  targetDir: string;
}

interface SomeOtherContext {
  namer: string;
}

export const AddSpaPageWorkflowMachine = makeWorkflowMachine<
  AddSpaPageWorkflowContext,
  typeof input
>({
  input,
  context: ({ input }) => {
    const pageName = input.name.endsWith("-page")
      ? input.name
      : input.name + "-page";
    const targetDir = path.join(process.cwd(), "pages", pageName);
    return { name: pageName, targetDir };
  },
  id: "add-spa-page",
  description:
    "Create a new page in a SAF-powered Vue SPA, using a template and renaming placeholders.",
  templateFiles: {
    loader: path.join(sourceDir, "TemplateFile.loader.ts"),
    vue: path.join(sourceDir, "TemplateFile.vue"),
    async: path.join(sourceDir, "TemplateFileAsync.vue"),
    strings: path.join(sourceDir, "TemplateFile.strings.ts"),
    test: path.join(sourceDir, "TemplateFile.test.ts"),
  },
  docFiles: {},
  steps: [
    {
      machine: CopyTemplateMachine,
      input: ({ context }) => {
        return {
          name: context.name,
          // targetDir: context.targetDir,
        };
      },
    },
    defineStep(CopyTemplateMachine, ({ context }) => ({
      name: context.name,
      targetDir: context.targetDir,
    })),
    // defineStep(PromptStepMachine, () => ({
    //   promptText: "Please update the test file",
    // })),
  ],
});
