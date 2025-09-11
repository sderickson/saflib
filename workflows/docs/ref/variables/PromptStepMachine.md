[**@saflib/workflows**](../index.md)

---

# Variable: PromptStepMachine

> `const` **PromptStepMachine**: `StateMachine`\<`PromptStepContext`, `AnyEventObject`, \{\[`key`: `string`\]: `undefined` \| `ActorRefFromLogic`\<`PromiseActorLogic`\<`unknown`, `NonReducibleUnknown`, `EventObject`\>\>; \}, \{ `id`: `undefined` \| `string`; `logic`: `PromiseActorLogic`\<`unknown`, `NonReducibleUnknown`, `EventObject`\>; `src`: `"noop"`; \}, `Values`\<\{ `log`: \{ `params`: `LogParams`; `type`: `"log"`; \}; `prompt`: \{ `params`: `PromptParams`; `type`: `"prompt"`; \}; \}\>, \{ `params`: `unknown`; `type`: `"dryRun"`; \}, `never`, `"done"` \| `"running"`, `string`, [`PromptStepInput`](../interfaces/PromptStepInput.md) & `WorkflowInput`, `NonReducibleUnknown`, `EventObject`, `MetaObject`, \{ `context`: (`__namedParameters`) => `object`; `id`: `"prompt-step"`; `initial`: `"running"`; `output`: (`__namedParameters`) => `object`; `states`: \{ `done`: \{ `type`: `"final"`; \}; `running`: \{ `entry`: `ActionFunction`\<`PromptStepContext`, `AnyEventObject`, `AnyEventObject`, `undefined`, `never`, `never`, `never`, `never`, `never`\>; `on`: \{ `continue`: \{ `target`: `"done"`; \}; `prompt`: readonly \[\{ `actions`: readonly \[`ActionFunction`\<`PromptStepContext`, `AnyEventObject`, `AnyEventObject`, `undefined`, `never`, `never`, `never`, `never`, `never`\>\]; `guard`: `"dryRun"`; \}, \{ `actions`: readonly \[\{ `params`: (`event`) => `object`; `type`: `"prompt"`; \}\]; \}\]; \}; \}; \}; \}\>

Prompts the agent or user to do something. Stops the workflow until the workflow is continued.
