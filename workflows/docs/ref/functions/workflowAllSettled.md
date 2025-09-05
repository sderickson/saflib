[**@saflib/workflows**](../index.md)

***

# Function: workflowAllSettled()

> **workflowAllSettled**(`snapshot`): `boolean`

Convenience function. Use with xstate's `waitFor` to wait for the workflow to halt, because it has prompted the agent to do something.

```ts
import { createActor, waitFor } from "xstate";
import { workflowAllSettled } from "@saflib/workflows";
const actor = createActor(WorkflowMachine, {
     input: { /* ... */ },
   });
   actor.start();
   await waitFor(actor, workflowAllSettled);
```

## Parameters

| Parameter | Type |
| ------ | ------ |
| `snapshot` | `AnyMachineSnapshot` |

## Returns

`boolean`
