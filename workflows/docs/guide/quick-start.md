# Quick Start

## Try It First

If you would like to see the workflow tool in action before setting it up on your own codebase, try cloning and using this [playground repository](https://github.com/sderickson/saflib-workflows-playground).

## Installation

In your project, install with npm or your package manager of choice. Since it's a developer tool, install it as a dev dependency.

```bash
npm install saflib-workflows --save-dev
```

Then you should be able to run the workflow tool with `npm exec saf-workflow`.

```bash
npm exec saf-workflow help
```

Paste in the following code somewhere in your project.

```ts
import {
  defineWorkflow,
  step,
  CommandStepMachine,
} from "saflib-workflows";

const input = [] as const;
interface HelloWorkflowContext {}

export const HelloWorkflowDefinition =
  defineWorkflow<
    typeof input,
    HelloWorkflowContext
  >({
    id: "demo/hello-workflow",
    description: "Say hello to the world",
    input,
    sourceUrl: import.meta.url,
    context: () => ({}),
    templateFiles: {},
    docFiles: {},
    steps: [
      step(CommandStepMachine, () => ({
        command: "echo",
        args: ["Hello, world!"],
      })),
    ],
  });

export default HelloWorkflowDefinition;
```

Then run the workflow with `npm exec saf-workflow kickoff ./path/to/hello-workflow.ts`. You should see something like this:

```bash
$ npm exec saf-workflow kickoff ./path/to/hello-workflow.ts 
[✓] Workflow successfully loaded
[✓] - Workflow:     demo/hello-workflow
[✓] - Description:  Say hello to the world
[✓] Running command: echo Hello, world!
Hello, world!
[✓] Successfully ran `echo Hello, world!`
--- To continue, run 'npm exec saf-workflow next' ---
```

Congrats! You've set up your first workflow.

## Setting Up a Custom CLI

If you'd rather refer to your workflows by id, you'll need to set up your own CLI.

First, add this `workflow-cli.ts` file to your project.

```ts
#!/usr/bin/env node --experimental-strip-types --disable-warning=ExperimentalWarning
// the line above lets Node run the file directly without compiling first.

import { runWorkflowCli } from "saflib-workflows";
import { HelloWorkflowDefinition } from "./hello-workflow.ts";

runWorkflowCli([
  HelloWorkflowDefinition,
]);
```

Then, add it to the `bin` section of your `package.json`.

```json
{
  /* ... */
  "bin": {
    "my-workflow": "./workflow-cli.ts"
  }
  /* ... */
}
```

Now you can run your workflows with `npm exec my-workflow`.

```bash
npm exec my-workflow kickoff demo/hello-workflow
```