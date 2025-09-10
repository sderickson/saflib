[**@saflib/workflows**](../index.md)

---

# Variable: CwdStepMachine

> `const` **CwdStepMachine**: `StateMachine`\<[`CwdStepContext`](../interfaces/CwdStepContext.md), `AnyEventObject`, \{\[`key`: `string`\]: `undefined` \| `ActorRefFromLogic`\<`PromiseActorLogic`\<`unknown`, `NonReducibleUnknown`, `EventObject`\>\>; \}, \{ `id`: `undefined` \| `string`; `logic`: `PromiseActorLogic`\<`unknown`, `NonReducibleUnknown`, `EventObject`\>; `src`: `"noop"`; \}, `Values`\<\{ `log`: \{ `params`: `LogParams`; `type`: `"log"`; \}; `prompt`: \{ `params`: `PromptParams`; `type`: `"prompt"`; \}; \}\>, `never`, `never`, `"done"`, `string`, [`CwdStepInput`](../interfaces/CwdStepInput.md) & `WorkflowInput`, [`WorkflowOutput`](../interfaces/WorkflowOutput.md), `EventObject`, `MetaObject`, \{ `context`: (`__namedParameters`) => `object`; `id`: `"cwd-step"`; `initial`: `"done"`; `output`: (`__namedParameters`) => `object`; `states`: \{ `done`: \{ `type`: `"final"`; \}; \}; \}\>

Updates the current working directory for subsequent steps, such as "copy", "update", and "command".
