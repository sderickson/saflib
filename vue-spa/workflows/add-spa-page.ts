import { raise, setup } from "xstate";
import {
  workflowActionImplementations,
  workflowActors,
  logInfo,
  promptAgent,
  XStateWorkflow,
  useTemplateStateFactory,
  kebabCaseToPascalCase,
  updateTemplateFileFactory,
  type TemplateWorkflowContext,
  runTestsFactory,
  promptAgentFactory,
} from "@saflib/workflows";
import path from "node:path";
import { fileURLToPath } from "node:url";

interface AddSpaPageWorkflowInput {
  name: string;
}

export const AddSpaPageWorkflowMachine = setup({
  types: {
    input: {} as AddSpaPageWorkflowInput,
    context: {} as TemplateWorkflowContext,
  },
  actions: workflowActionImplementations,
  actors: workflowActors,
}).createMachine({
  id: "add-spa-page",
  description:
    "Create a new page in a SAF-powered Vue SPA, using a template and renaming placeholders.",
  initial: "copyTemplate",
  context: ({ input }) => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const sourceDir = path.join(__dirname, "page-template");

    // Only append "-page" if the name doesn't already end with "-page"
    const pageName = input.name.endsWith("-page")
      ? input.name
      : input.name + "-page";
    const targetDir = path.join(process.cwd(), "pages", pageName);

    return {
      name: pageName,
      pascalName: kebabCaseToPascalCase(pageName),
      targetDir,
      sourceDir,
      loggedLast: false,
    };
  },
  entry: logInfo("Successfully began workflow"),
  states: {
    // First copy over the files
    ...useTemplateStateFactory({
      stateName: "copyTemplate",
      nextStateName: "updateLoader",
    }),

    // Then for each file, have the agent update it
    ...updateTemplateFileFactory({
      filePath: (context) =>
        path.join(context.targetDir, `${context.pascalName}.loader.ts`),
      promptMessage: (context) =>
        `Please update the loader method in ${context.pascalName}.loader.ts to return any necessary Tanstack queries for rendering the page.`,
      stateName: "updateLoader",
      nextStateName: "useLoader",
    }),

    ...updateTemplateFileFactory({
      filePath: (context) =>
        path.join(context.targetDir, `${context.pascalName}.vue`),
      promptMessage: (context) =>
        `Please update ${context.pascalName}.vue to take the data from the loader, assert that it's loaded, then render sample the data using Vuetify components. Don't create the UX just yet; focus on making sure the data is loading properly.`,
      stateName: "useLoader",
      nextStateName: "updateRouter",
    }),

    ...updateTemplateFileFactory({
      filePath: "router.ts",
      promptMessage: (context) =>
        `Please update the router.ts file to include the new page. Add a new route for ${context.name} that uses the ${context.pascalName}Async component. The route should be at "/${context.name}".`,
      stateName: "updateRouter",
      nextStateName: "updateTests",
    }),

    ...updateTemplateFileFactory({
      filePath: (context) =>
        path.join(context.targetDir, `${context.pascalName}.test.ts`),
      promptMessage: (context) =>
        `Please update ${context.pascalName}.test.ts to mock the server requests and verify that the raw data from the loader is rendered correctly.`,
      stateName: "updateTests",
      nextStateName: "runTestsOnStubbedPage",
    }),

    // Run the tests to make sure the loader and page are basically working
    ...runTestsFactory({
      filePath: (context) =>
        path.join(context.targetDir, `${context.pascalName}.test.ts`),
      stateName: "runTestsOnStubbedPage",
      nextStateName: "implementDesign",
    }),

    ...updateTemplateFileFactory({
      filePath: (context) =>
        path.join(context.targetDir, `${context.pascalName}.vue`),
      promptMessage: (context) =>
        `Please update ${context.pascalName}.vue to match the design. Use Vuetify components and variables instead of custom styles, even if it means the design isn't pixel-perfect. Do NOT set any style tags.`,
      stateName: "implementDesign",
      nextStateName: "updateTestsForDesign",
    }),

    ...updateTemplateFileFactory({
      filePath: (context) =>
        path.join(context.targetDir, `${context.pascalName}.test.ts`),
      promptMessage: (context) =>
        `Please update ${context.pascalName}.test.ts to verify that the page renders correctly with the new design. Update the helper methods to locate actual key elements of the page, then update the one test to check that they all exist and have the right text.`,
      stateName: "updateTestsForDesign",
      nextStateName: "runTestsOnFinishedPage",
    }),

    ...runTestsFactory({
      filePath: (context) =>
        path.join(context.targetDir, `${context.pascalName}.test.ts`),
      stateName: "runTestsOnFinishedPage",
      nextStateName: "verifyDone",
    }),

    ...promptAgentFactory({
      stateName: "verifyDone",
      nextStateName: "done",
      promptForContext: () =>
        `Have the human run the website and confirm that the page looks and works as expected.`,
    }),

    done: {
      type: "final",
    },
  },
});

export class AddSpaPageWorkflow extends XStateWorkflow {
  machine = AddSpaPageWorkflowMachine;
  description =
    "Create a new page in a SAF-powered Vue SPA, using a template and renaming placeholders.";
  cliArguments = [
    {
      name: "name",
      description:
        "Name of the new page in kebab-case (e.g. 'welcome-new-user' or 'welcome-new-user-page')",
    },
  ];
}
