[**@saflib/workflows**](../index.md)

***

# Variable: UpdateStepMachine

> `const` **UpdateStepMachine**: `StateMachine`\<`UpdateStepContext`, `AnyEventObject`, \{\[`key`: `string`\]: `undefined` \| `ActorRefFromLogic`\<`PromiseActorLogic`\<`unknown`, `NonReducibleUnknown`, `EventObject`\>\>; \}, \{ `id`: `undefined` \| `string`; `logic`: `PromiseActorLogic`\<`unknown`, `NonReducibleUnknown`, `EventObject`\>; `src`: `"noop"`; \}, `Values`\<\{ `log`: \{ `params`: `LogParams`; `type`: `"log"`; \}; `prompt`: \{ `params`: `PromptParams`; `type`: `"prompt"`; \}; \}\>, `never`, `never`, `"done"` \| `"update"`, `string`, [`UpdateStepInput`](../interfaces/UpdateStepInput.md) & `WorkflowInput`, [`WorkflowOutput`](../interfaces/WorkflowOutput.md), `EventObject`, `MetaObject`, \{ `context`: (`__namedParameters`) => `object`; `id`: `"update-step"`; `initial`: `"update"`; `output`: (`__namedParameters`) => `object`; `states`: \{ `done`: \{ `type`: `"final"`; \}; `update`: \{ `entry`: `ActionFunction`\<`UpdateStepContext`, `AnyEventObject`, `AnyEventObject`, `undefined`, `never`, `never`, `never`, `never`, `never`\>; `on`: \{ `continue`: readonly \[\{ `actions`: readonly \[\{ `params`: (`event`) => `object`; `type`: `"log"`; \}\]; `guard`: (`__namedParameters`) => `boolean`; \}, \{ `actions`: readonly \[`ActionFunction`\<`UpdateStepContext`, `AnyEventObject`, `AnyEventObject`, `undefined`, \{ `id`: ... \| ...; `logic`: `PromiseActorLogic`\<..., ..., ...\>; `src`: `"noop"`; \}, `never`, `never`, `never`, `never`\>\]; `target`: `"done"`; \}\]; `prompt`: \{ `actions`: readonly \[\{ `params`: (`event`) => `object`; `type`: `"prompt"`; \}\]; \}; \}; \}; \}; \}\>

Prompts the agent to update one of the templateFiles that was copied over by the CopyStepMachine.
