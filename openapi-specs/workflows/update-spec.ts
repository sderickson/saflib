import { SimpleWorkflow } from "@saflib/workflows";
import { resolve } from "path";
interface UpdateSpecWorkflowParams {}

export class UpdateSpecWorkflow extends SimpleWorkflow<UpdateSpecWorkflowParams> {
  name = "update-spec";
  description = "Update the OpenAPI spec for the project.";

  init = async () => {
    this.params = {};
    return { data: {} };
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
        `Read the spec. Ask for it if you haven't got it already.

        Also, review the documentation for updating specs: ${this.computed().refDoc}`,
    },
    {
      name: "Update the spec",
      prompt: () =>
        `Add common objects to the "schemas" folder, and routes to the "routes" folder. Then link them in the "openapi.yaml" file.`,
    },
    {
      name: "Generate files",
      prompt: () => `Generate the files by running "npm run generate".`,
    },
  ];
}
