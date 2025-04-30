import { SimpleWorkflow } from "@saflib/workflows";

export class SpecProjectWorkflow extends SimpleWorkflow<{ slug: string }> {
  name = "spec-project";
  description = "Write a product/technical specification for a project.";

  init = async (slug: string) => {
    this.params = { slug };
    return { data: {} };
  };

  cliArguments = [
    {
      name: "slug",
      description:
        "kebab-case name of project to use in folder and git branch names and alike",
    },
  ];

  workflowPrompt = () => {
    // Prompt logic if needed
    return "Kicking off spec-project workflow."; // Return a simple prompt string for now
  };

  steps = [
    // Workflow steps will be added here
  ];
}
