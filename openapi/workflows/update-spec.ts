import { SimpleWorkflow } from "@saflib/workflows";
import { resolve } from "path";
interface UpdateSpecWorkflowParams {}

export class UpdateSpecWorkflow extends SimpleWorkflow<UpdateSpecWorkflowParams> {
  name = "update-spec";
  description = "Update the OpenAPI spec for the project.";
  sourceUrl = import.meta.url;
  init = async () => {
    this.params = {};
    return { result: {} };
  };

  cliArguments = [];

  workflowPrompt = () => {
    return "You are updating an OpenAPI spec which is used to generate types, validate requests and responses, specify common API objects, and specify security measures such as scopes.";
  };

  computed = () => {
    const refDoc = resolve(import.meta.dirname, "../docs/03-updates.md");
    return {
      refDoc,
    };
  };

  steps = [
    {
      name: "Get Oriented",
      prompt: () =>
        `Read the spec. Ask for it if you haven't got it already.\n\nAlso, review the documentation for updating specs: ${this.computed().refDoc}`,
    },
    {
      name: "Update the spec",
      prompt: () =>
        `Add common objects to the "schemas" folder, and routes to the "routes" folder. Then link them in the "openapi.yaml" file.\n\n**Tip:** For request bodies, reference the properties from your main schema directly. Example:\n\n    schema:\n      type: object\n      properties:\n        $ref: '../schemas/your-schema.yaml#/properties'\n    # You can then specify a 'required' array separately if needed for the request,\n    # or omit it if all properties are optional for the request body.\n
This keeps your spec DRY and easier to maintain.`,
    },
    {
      name: "Update openapi.yaml",
      prompt: () =>
        `Update the openapi.yaml file to include the new routes and schemas.`,
    },
    {
      name: "Generate files",
      prompt: () => `Generate the files by running "npm run generate".`,
    },
    {
      name: "Update index.ts",
      prompt: () =>
        `Update index.ts to export any new schemas that were added to the spec.`,
    },
  ];
}
