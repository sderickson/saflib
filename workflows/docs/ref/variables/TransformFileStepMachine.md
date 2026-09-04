[**@saflib/workflows**](../index.md)

---

# Variable: TransformFileStepMachine

> `const` **TransformFileStepMachine**: `StateMachine`\<`TransformFileStepContext`, `AnyEventObject`, \{\[`key`: `string`\]: `undefined` \| `ActorRefFromLogic`\<`PromiseActorLogic`\<`unknown`, `NonReducibleUnknown`, `EventObject`>> \>\> \| `ActorRefFromLogic`\<`PromiseActorLogic`\<`void`, `TransformFileStepContext`, `EventObject`>>\>\>; \}, `Values`\<\{ `noop`: \{ `id`: `undefined` \| `string`; `logic`: `PromiseActorLogic`\<`unknown`, `NonReducibleUnknown`, `EventObject`>\>; `src`: `"noop"`; \}; `transformFile`: \{ `id`: `undefined` \| `string`; `logic`: `PromiseActorLogic`\<`void`, `TransformFileStepContext`, `EventObject`>\>; `src`: `"transformFile"`; \}; \}\>, \{ `params`: `LogParams`; `type`: `"log"`; \}, `never`, `never`, `"done"` \| `"transform"`, `string`, [`TransformFileStepInput`](../interfaces/TransformFileStepInput.md) & `WorkflowInput`, `WorkflowOutput`, `EventObject`, `MetaObject`, \{ `context`: (`__namedParameters`) => `object`; `id`: `"transform-file-step"`; `initial`: `"transform"`; `output`: (`__namedParameters`) => `object`; `states`: \{ `done`: \{ `type`: `"final"`; \}; `transform`: \{ `invoke`: \{ `input`: (`__namedParameters`) => `TransformFileStepContext`; `onDone`: \{ `actions`: \{ `params`: (`event`) => `object`; `type`: `"log"`; \}; `target`: `"done"`; \}; `src`: `"transformFile"`; \}; \}; \}; \}\>

Programmatically transforms a file's content. Reads the file, applies the
transform function, and writes the result back. Useful for structured edits
(JSON, YAML, etc.) that are too mechanical for an agent prompt but need more
control than template copying.
