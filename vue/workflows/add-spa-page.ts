import { setup, type InputFrom } from "xstate";
import {
  CopyTemplateMachine,
  UpdateStepMachine,
  PromptStepMachine,
  makeWorkflowMachine,
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

export const AddSpaPageWorkflowMachine = makeWorkflowMachine({
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
        type Input = InputFrom<typeof CopyTemplateMachine>;
        return {
          name: context.name,
          targetDir: context.targetDir,
        } satisfies Input;
      },
    },
  ],
});
