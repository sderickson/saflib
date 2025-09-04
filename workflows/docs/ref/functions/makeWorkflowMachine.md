[**@saflib/workflows**](../index.md)

***

# Function: makeWorkflowMachine()

> **makeWorkflowMachine**\<`C`, `I`\>(`config`): `StateMachine`\<`Context`, `AnyEventObject`, \{\[`key`: `string`\]: `undefined` \| `ActorRefFromLogic`\<`PromiseActorLogic`\<`unknown`, `NonReducibleUnknown`, `EventObject`\>\>; \}, \{ `id`: `undefined` \| `string`; `logic`: `PromiseActorLogic`\<`unknown`, `NonReducibleUnknown`, `EventObject`\>; `src`: `"noop"`; \}, `Values`\<\{ `log`: \{ `params`: `LogParams`; `type`: `"log"`; \}; `prompt`: \{ `params`: `PromptParams`; `type`: `"prompt"`; \}; \}\>, `never`, `never`, `string`, `string`, `Input`, `WorkflowOutput`, `EventObject`, `MetaObject`, \{ `context`: (`__namedParameters`) => `Context`; `description`: `string`; `entry`: `ActionFunction`\<`DoNotInfer`\<`Context`\>, `AnyEventObject`, `AnyEventObject`, `undefined`, `never`, `never`, `never`, `never`, `never`\>; `id`: `string`; `initial`: `"step_0"`; `output`: (`__namedParameters`) => `WorkflowOutput`; `states`: `Record`\<`string`, `object`\>; \}\>

From a Workflow object, create an XState machine.

This basically translates my simplified and scoped workflow machine definition to the full XState machine definition.

## Type Parameters

| Type Parameter |
| ------ |
| `C` |
| `I` *extends* readonly [`CLIArgument`](../interfaces/CLIArgument.md)[] |

## Parameters

| Parameter | Type |
| ------ | ------ |
| `config` | [`Workflow`](../interfaces/Workflow.md)\<`I`, `C`\> |

## Returns

`StateMachine`\<`Context`, `AnyEventObject`, \{\[`key`: `string`\]: `undefined` \| `ActorRefFromLogic`\<`PromiseActorLogic`\<`unknown`, `NonReducibleUnknown`, `EventObject`\>\>; \}, \{ `id`: `undefined` \| `string`; `logic`: `PromiseActorLogic`\<`unknown`, `NonReducibleUnknown`, `EventObject`\>; `src`: `"noop"`; \}, `Values`\<\{ `log`: \{ `params`: `LogParams`; `type`: `"log"`; \}; `prompt`: \{ `params`: `PromptParams`; `type`: `"prompt"`; \}; \}\>, `never`, `never`, `string`, `string`, `Input`, `WorkflowOutput`, `EventObject`, `MetaObject`, \{ `context`: (`__namedParameters`) => `Context`; `description`: `string`; `entry`: `ActionFunction`\<`DoNotInfer`\<`Context`\>, `AnyEventObject`, `AnyEventObject`, `undefined`, `never`, `never`, `never`, `never`, `never`\>; `id`: `string`; `initial`: `"step_0"`; `output`: (`__namedParameters`) => `WorkflowOutput`; `states`: `Record`\<`string`, `object`\>; \}\>
