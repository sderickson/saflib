[**@saflib/workflows**](../index.md)

---

# Function: makeWorkflowMachine()

> **makeWorkflowMachine**\<`C`, `I`\>(`config`): `StateMachine`\<`Context`, `AnyEventObject`, \{\[`key`: `string`\]: `undefined` \| `ActorRefFromLogic`\<`PromiseActorLogic`\<`unknown`, `NonReducibleUnknown`, `EventObject`\>\>; \}, \{ `id`: `undefined` \| `string`; `logic`: `PromiseActorLogic`\<`unknown`, `NonReducibleUnknown`, `EventObject`\>; `src`: `"noop"`; \}, `Values`\<\{ `log`: \{ `params`: `LogParams`; `type`: `"log"`; \}; `prompt`: \{ `params`: `unknown`; `type`: `"prompt"`; \}; \}\>, `never`, `never`, `string`, `string`, `Input`, `WorkflowOutput`, `EventObject`, `MetaObject`, \{ `context`: (`__namedParameters`) => `Context`; `description`: `string`; `entry`: `ActionFunction`\<`DoNotInfer`\<`Context`\>, `AnyEventObject`, `AnyEventObject`, `undefined`, `never`, `never`, `never`, `never`, `never`\>; `id`: `string`; `initial`: `"step_0"`; `output`: (`__namedParameters`) => `object`; `states`: `Record`\<`string`, `object`\>; \}\>

Takes a WorkflowsDefinition, as well as its Context and Input types, and creates an XState machine.

This basically translates my simplified and scoped workflow machine definition to the full XState machine definition.

## Type Parameters

| Type Parameter                                                                   |
| -------------------------------------------------------------------------------- |
| `C`                                                                              |
| `I` _extends_ readonly [`WorkflowArgument`](../interfaces/WorkflowArgument.md)[] |

## Parameters

| Parameter | Type                                                                    |
| --------- | ----------------------------------------------------------------------- |
| `config`  | [`WorkflowDefinition`](../interfaces/WorkflowDefinition.md)\<`I`, `C`\> |

## Returns

`StateMachine`\<`Context`, `AnyEventObject`, \{\[`key`: `string`\]: `undefined` \| `ActorRefFromLogic`\<`PromiseActorLogic`\<`unknown`, `NonReducibleUnknown`, `EventObject`\>\>; \}, \{ `id`: `undefined` \| `string`; `logic`: `PromiseActorLogic`\<`unknown`, `NonReducibleUnknown`, `EventObject`\>; `src`: `"noop"`; \}, `Values`\<\{ `log`: \{ `params`: `LogParams`; `type`: `"log"`; \}; `prompt`: \{ `params`: `unknown`; `type`: `"prompt"`; \}; \}\>, `never`, `never`, `string`, `string`, `Input`, `WorkflowOutput`, `EventObject`, `MetaObject`, \{ `context`: (`__namedParameters`) => `Context`; `description`: `string`; `entry`: `ActionFunction`\<`DoNotInfer`\<`Context`\>, `AnyEventObject`, `AnyEventObject`, `undefined`, `never`, `never`, `never`, `never`, `never`\>; `id`: `string`; `initial`: `"step_0"`; `output`: (`__namedParameters`) => `object`; `states`: `Record`\<`string`, `object`\>; \}\>
