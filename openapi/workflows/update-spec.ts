import { setup } from "xstate";
import {
  workflowActions,
  workflowActors,
  logInfo,
  type WorkflowContext,
  promptAgentComposer,
  runNpmCommandComposer,
  XStateWorkflow,
  contextFromInput,
  type WorkflowInput,
  outputFromContext,
} from "@saflib/workflows";
import { resolve } from "path";
import { fileURLToPath } from "node:url";

interface UpdateSpecWorkflowInput extends WorkflowInput {}

interface UpdateSpecWorkflowContext extends WorkflowContext {
  refDoc: string;
}

export const UpdateSpecWorkflowMachine = setup({
  types: {
    input: {} as UpdateSpecWorkflowInput,
    context: {} as UpdateSpecWorkflowContext,
  },
  actions: workflowActions,
  actors: workflowActors,
}).createMachine({
  id: "update-spec",
  description: "Update the OpenAPI spec for the project.",
  initial: "getOriented",
  context: ({ input }) => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = resolve(__filename, "..");
    const refDoc = resolve(__dirname, "docs/03-updates.md");

    return {
      refDoc,
      ...contextFromInput(input),
    };
  },
  entry: logInfo("Successfully began workflow"),
  states: {
    ...promptAgentComposer<UpdateSpecWorkflowContext>({
      promptForContext: ({ context }) =>
        `Review the project spec, and the documentation for updating specs.
      
      ${context.refDoc}`,
      stateName: "getOriented",
      nextStateName: "updateSpec",
    }),

    ...promptAgentComposer<UpdateSpecWorkflowContext>({
      promptForContext: () =>
        `Add common objects to \`schemas\/\`, and routes to \`routes\/\`. Then link them in the \`openapi.yaml\` file.

        **Tip:** For request bodies, reference the properties from your main schema directly. Example:

            schema:
              type: object
              properties:
                $ref: '../schemas/your-schema.yaml#/properties'
            # You can then specify a 'required' array separately if needed for the request,
            # or omit it if all properties are optional for the request body.

        This keeps your spec DRY and easier to maintain.
        
        Also, when creating a route file, have the top-level property be the same as the operationId.`,
      stateName: "updateSpec",
      nextStateName: "updateOpenapiYaml",
    }),

    ...promptAgentComposer<UpdateSpecWorkflowContext>({
      promptForContext: () =>
        `Update the openapi.yaml file to include the new routes and schemas.`,
      stateName: "updateOpenapiYaml",
      nextStateName: "generateFiles",
    }),

    ...runNpmCommandComposer({
      command: "run generate",
      stateName: "generateFiles",
      nextStateName: "updateIndexTs",
    }),

    ...promptAgentComposer<UpdateSpecWorkflowContext>({
      promptForContext: () =>
        `Update \`index.ts\` to export any new schemas that were added to the spec.`,
      stateName: "updateIndexTs",
      nextStateName: "done",
    }),

    done: {
      type: "final",
    },
  },
  output: outputFromContext,
});

export class UpdateSpecWorkflow extends XStateWorkflow {
  machine = UpdateSpecWorkflowMachine;
  description = "Update the OpenAPI spec for the project.";
  cliArguments = [];
  sourceUrl = import.meta.url;
}
