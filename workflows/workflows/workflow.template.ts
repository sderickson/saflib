import { SimpleWorkflow } from "@saflib/workflows";

interface ToDoWorkflowParams {
  // TODO
}

export class ToDoWorkflow extends SimpleWorkflow<ToDoWorkflowParams> {
  name = "todo";
  description = "TODO";

  init = async (/* param1: string, param2: string */) => {
    this.params = {
      /* param1, param2 */
    };
    return { data: {} };
  };

  cliArguments = [
    {
      name: "param1",
      description: "TODO",
    },
    {
      name: "param2",
      description: "TODO",
    },
  ];

  workflowPrompt = () => {
    return "TODO"; // This string will be printed every step of the way. Use it to remind the agent of the overall goal.
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
