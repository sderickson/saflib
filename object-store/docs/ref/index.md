**@saflib/object-store**

---

# @saflib/object-store

## Classes

| Class                                               | Description                                                                                                                 |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| [DiskObjectStore](classes/DiskObjectStore.md)       | -                                                                                                                           |
| [FileNotFoundError](classes/FileNotFoundError.md)   | -                                                                                                                           |
| [ObjectStore](classes/ObjectStore.md)               | -                                                                                                                           |
| [PathTraversalError](classes/PathTraversalError.md) | -                                                                                                                           |
| [StorageError](classes/StorageError.md)             | -                                                                                                                           |
| [TestObjectStore](classes/TestObjectStore.md)       | In-memory ObjectStore for tests. Use setFiles/getFiles to seed or inspect state when testing code that uses an ObjectStore. |

## Interfaces

| Interface                          | Description |
| ---------------------------------- | ----------- |
| [TestFile](interfaces/TestFile.md) | -           |

## Type Aliases

| Type Alias                                                           | Description |
| -------------------------------------------------------------------- | ----------- |
| [CreateObjectStoreOptions](type-aliases/CreateObjectStoreOptions.md) | -           |

## Functions

| Function                                            | Description                                                                                                                                                                                                                                                                         |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [createObjectStore](functions/createObjectStore.md) | Creates an ObjectStore instance. When NODE_ENV is "test", always returns a TestObjectStore (in-memory) regardless of the requested type, so tests don't write to disk. Stores are cached by container key so multiple contexts with the same config share the same in-memory store. |
