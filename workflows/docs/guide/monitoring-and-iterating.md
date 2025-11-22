# Monitoring and Iterating

## First run

Even if you follow all the best practices for writing workflows, a routine workflow will likely need to go through some initial testing and iterating to get decent results. Use the [checklist](./manual-testing.md#produce-a-checklist) command and then the [run-scripts](./manual-testing.md#run-scripts) command to make sure there isn't anything fundamentally broken before introducing an agent. The first time you run it with an agent, monitor it closely for issues where the agent goes down the wrong path or takes longer to do something than expected. Treat it like a UX test, where the agent is testing and finding the rough edges. Review what the agent ends up generating, and consider making changes to the workflow to improve the results. To thoroughly put the workflow through its paces, delete the output and run it again entirely, and repeat as needed.

Because it's often easier to review, consider running the workflow [with the agent in control](./with-an-agent.md#the-agent-invokes-the-workflow-tool). You'll be paying close attention anyway; have the CLI drive when the workflow is good enough.

## Logs

Running the workflow with the agent in control should produce plenty of logs to review by the agent you are prompting to use the workflow tool; use them to debug where agents get stuck or go awry.

When the CLI drives, logs are provided but may require more work to parse. The CLI will print out a log with summaries of agent actions so they're readable in real time, and also will save everything the headless agent provides to an adjacent file.

## Interjecting

If you do notice something going wrong, you can halt the agent's execution and resume safely. If the agent is driving, simply prompt the agent with instructions and remind them to run `npm exec saf-workflow next` to continue. If the tool is driving, you can run that command yourself with a message to give the agent.

```bash
npm exec saf-workflow next -- -m "Don't use that approach, use..."
```

Changing the workflow in the middle of a run might work but no guarantees. If you don't edit any steps which have already happened, and don't edit the step currently being executed, it will probably work. However, if you edit the workflow heavily, it will probably be best to start a new workflow instead. If you're partway through a complex workflow, comment out the steps that have already completed and kick it off fresh.

## Errors

If an error happens during execution, the workflow state machine will enter an error state. The state of the machine will be saved to a file for review, see [xstate](https://stately.ai/docs) for more information about how these state machines work.

The workflow tool automatically saves the current state of the state machine whenever it changes, but it will not save the state if the machine is in an error state. This is because once the machine has errored, it's basically irrecoverable. You may be able to fix the source of the error and run `npm exec saf-workflow next` and continue.

## Improving your workflow

One of the benefits of having a workflow in your codebase is that it provides something concrete you can improve over time and managed in version control. Every time you code review work done by an agent through a workflow and find areas of improvement, make changes to the workflow to get those improvements going forward. This includes:

* Add [TODOs](./templates.md#adding-todos) to the template, along with basic instructions
* Modify prompts in [steps](./steps.md) to give more general guidance on what to do or not to do
* Try out different steps. Combine, rearrange, make conditional, add validation checks, etc. See [best practices](./steps.md#best-practices) for ideas.
* Update [docs](./documentation.md), especially if they are not consistent with workflow instructions.

While investing in workflows is critical to getting the sort of fast, consistent results you want, they're fundamentally limited by the codebase they are built for. Improving the reliability of workflows may not mean improving the workflow, but instead improving the codebase itself. The more complicated, brittle, counter-intuitive, tightly coupled, and inconsistent the codebase is, the harder both agents and humans will have being effective, regardless of the approach, experience, or tooling brought to bear.

For more information about how to set up your codebase for agentic coding, see [best practices](https://docs.saf-demo.online/best-practices.html).