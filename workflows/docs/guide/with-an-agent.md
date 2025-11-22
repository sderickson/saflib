# With an Agent

## The agent invokes the workflow tool

The most universal way to run a workflow is to prompt the agent to run the workflow tool. Give it the command to run, whatever context it needs, and let it do the rest.

```
Run the following command and follow its instructions until the workflow is complete:

npm exec saf-workflow kickoff ./path/to/workflow.ts

The thing you're building should...
```

This plays nicely with the UI provided with the agent. For example, Cursor highlights and walks through what changes the agent makes, and so they're distinguished from scripted changes made by the workflow tool such as through commands or copying files.

The main downside is there is no accountability at the top level provided by the workflow tool. You will need to make sure the agent actually completed the workflow, and if the workflow is long you may need to periodically prod it to continue. This limits how "hands off" you can really be.

## The workflow tool invokes the agent

A more dependable but less universal way to run a workflow is to have the CLI tool invoke the agent.

```bash
npm exec saf-workflow kickoff ./path/to/workflow.ts -- -r cursor
```

This requires the agent to provide a headless CLI interface, and the workflow tool to have an integration with it. The main benefit is the workflow tool will always report correctly whether the workflow has been completed successfully. The only way to have a workflow run fully automatically is by having the CLI tool drive.

If you stop the workflow in the middle, you can resume with the `next` command, and also insert a message to the agent if needed (which it often is if the workflow was stopped).

```bash
npm exec saf-workflow next -- -m "Don't use that approach, use..."
```

The `-m` option can also be passed into the `kickoff` command to provide initial custom instructions.
