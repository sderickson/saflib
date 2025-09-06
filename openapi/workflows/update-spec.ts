import {
  PromptStepMachine,
  CommandStepMachine,
  DocStepMachine,
  defineWorkflow,
  step,
} from "@saflib/workflows";
import { resolve } from "path";

const input = [] as const;

interface UpdateSpecWorkflowContext {}

export const UpdateSpecWorkflowDefinition = defineWorkflow<
  typeof input,
  UpdateSpecWorkflowContext
>({
  id: "openapi/update-spec",

  description: "Update the OpenAPI spec for the project.",

  input,

  sourceUrl: import.meta.url,

  context: () => ({}),

  templateFiles: {},

  docFiles: {
    overviewDoc: resolve(import.meta.dirname, "../docs/01-overview.md"),
  },

  steps: [
    step(DocStepMachine, () => ({
      docId: "overviewDoc",
    })),

    step(PromptStepMachine, () => ({
      promptText: `Add common objects to \`schemas\/\`, and routes to \`routes\/\`. Then link them in the \`openapi.yaml\` file.

        **Tip:** For request bodies, reference the properties from your main schema directly. Example:

            schema:
              type: object
              properties:
                $ref: '../schemas/your-schema.yaml#/properties'
            # You can then specify a 'required' array separately if needed for the request,
            # or omit it if all properties are optional for the request body.

        This keeps your spec DRY and easier to maintain.
        
        Also, when creating a route file, have the top-level property be the same as the operationId.`,
    })),

    step(PromptStepMachine, () => ({
      promptText: `Update the openapi.yaml file to include the new routes and schemas.`,
    })),

    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["run", "generate"],
    })),

    step(PromptStepMachine, () => ({
      promptText: `Update \`index.ts\` to export any new schemas that were added to the spec.`,
    })),
  ],
});
