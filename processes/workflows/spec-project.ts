import { SimpleWorkflow } from "@saflib/workflows";

interface SpecProjectWorkflowParams {
  slug: string;
}

export class SpecProjectWorkflow extends SimpleWorkflow<SpecProjectWorkflowParams> {
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
    return `You are writing a product/technical specification for ${this.getParams().slug}.`;
  };

  steps = [
    {
      name: "Step 1",
      prompt: () => "TODO",
    },
    {
      name: "Step 2",
      prompt: () => "TODO",
    },
  ];
}
