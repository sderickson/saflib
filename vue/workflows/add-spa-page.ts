import {
  CopyTemplateMachine,
  UpdateStepMachine,
  PromptStepMachine,
  makeWorkflowMachine,
  step,
  TestStepMachine,
  XStateWorkflow,
} from "@saflib/workflows";
import path from "node:path";

const input = [
  {
    name: "name",
    description: "Name of the new page in kebab-case (e.g. 'welcome-new-user')",
    exampleValue: "example-page",
  },
] as const;

const sourceDir = path.join(import.meta.dirname, "page-template");

interface AddSpaPageWorkflowContext {
  name: string;
  targetDir: string;
}

export const AddSpaPageWorkflowMachine = makeWorkflowMachine<
  AddSpaPageWorkflowContext,
  typeof input
>({
  id: "add-spa-page",

  description:
    "Create a new page in a SAF-powered Vue SPA, using a template and renaming placeholders.",

  input,

  context: ({ input }) => {
    const pageName = input.name.endsWith("-page")
      ? input.name
      : input.name + "-page";
    const targetDir = path.join(process.cwd(), "pages", pageName);
    return { name: pageName, targetDir };
  },

  templateFiles: {
    loader: path.join(sourceDir, "TemplateFile.loader.ts"),
    vue: path.join(sourceDir, "TemplateFile.vue"),
    async: path.join(sourceDir, "TemplateFileAsync.vue"),
    strings: path.join(sourceDir, "TemplateFile.strings.ts"),
    test: path.join(sourceDir, "TemplateFile.test.ts"),
  },

  docFiles: {},

  steps: [
    step(CopyTemplateMachine, ({ context }) => ({
      name: context.name,
      targetDir: context.targetDir,
    })),

    step(UpdateStepMachine, ({ context }) => {
      console.log("update-step context", context.copiedFiles);
      return {
        fileId: "loader",
        promptMessage: `Please update the loader method in ${path.basename(context.copiedFiles!.loader)} to return any necessary Tanstack queries for rendering the page.`,
      };
    }),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "vue",
      promptMessage: `Please update ${path.basename(context.copiedFiles!.vue)} to take the data from the loader, assert that it's loaded, then render sample the data using Vuetify components. Don't create the UX just yet; focus on making sure the data is loading properly. Do not add any sort of loading state or skeleton; that's the job of the "Async" component.`,
    })),

    step(PromptStepMachine, () => ({
      promptText: `Find the "links" package adjacent to this package. Add the link for the new page there along with the others.`,
    })),

    step(PromptStepMachine, ({ context }) => ({
      promptText: `Please update the router.ts file to include the new page. Add a new route for ${context.name} that uses ${path.basename(context.copiedFiles!.async)}. Use the link from the shared links package instead of hardcoding the path.`,
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "test",
      promptMessage: `Please update ${path.basename(context.copiedFiles!.test)} to mock the server requests and verify that the raw data from the loader is rendered correctly.`,
    })),

    step(TestStepMachine, () => ({
      fileId: "test",
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "strings",
      promptMessage: `Please update ${path.basename(context.copiedFiles!.strings)} to include all text from the design. Use string keys that will work well with the translation system (e.g., 'title', 'subtitle', 'description', etc.).`,
    })),

    step(PromptStepMachine, () => ({
      promptText: `Find the strings.ts file in the root of the package. Add the strings from the file you just updated there.`,
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "vue",
      promptMessage: `Please update ${path.basename(context.copiedFiles!.vue)} to match the design and use the translation system. Import and use the "useReverseT" function from the i18n.ts file at the root of the package, and use t(strings.key) instead of strings.key for all text. Use Vuetify components and variables instead of custom styles, even if it means the design isn't pixel-perfect. Do NOT set any style tags.`,
    })),

    step(UpdateStepMachine, ({ context }) => ({
      fileId: "test",
      promptMessage: `Please update ${path.basename(context.copiedFiles!.test)} to verify that the page renders correctly with the new design and translation system. Update the helper methods to locate actual key elements of the page, then update the one test to check that they all exist and have the right text. Only use "getElementByString" to locate elements, using the strings from the strings file as the argument.`,
    })),

    step(TestStepMachine, () => ({
      fileId: "test",
    })),

    step(TestStepMachine, () => ({})),
  ],
});

export class AddSpaPageWorkflow extends XStateWorkflow {
  machine = AddSpaPageWorkflowMachine;
  description =
    "Create a new page in a SAF-powered Vue SPA, using a template and renaming placeholders.";
  cliArguments = [
    {
      name: "name",
      description:
        "Name of the new page in kebab-case (e.g. 'welcome-new-user')",
      exampleValue: "example-page",
    },
  ];
  sourceUrl = import.meta.url;
}
