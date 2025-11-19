[**@saflib/workflows**](../index.md)

---

# Variable: CdStepMachine

> `const` **CdStepMachine**: `StateMachine`\<`CdStepContext`, `AnyEventObject`, \{\[`key`: `string`\]: `undefined` \| `ActorRefFromLogic`\<`PromiseActorLogic`\<`unknown`, `NonReducibleUnknown`, `EventObject`\>\>; \}, \{ `id`: `undefined` \| `string`; `logic`: `PromiseActorLogic`\<`unknown`, `NonReducibleUnknown`, `EventObject`\>; `src`: `"noop"`; \}, \{ `params`: `LogParams`; `type`: `"log"`; \}, `never`, `never`, `"done"`, `string`, [`CdStepInput`](../interfaces/CdStepInput.md) & `WorkflowInput`, `WorkflowOutput`, `EventObject`, `MetaObject`, \{ `context`: (`__namedParameters`) => `object`; `id`: `"cwd-step"`; `initial`: `"done"`; `output`: (`__namedParameters`) => `object`; `states`: \{ `done`: \{ `type`: `"final"`; \}; \}; \}\>

Updates the current working directory for subsequent steps, such as "copy", "update", and "command".
