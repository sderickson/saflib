[**@saflib/secret-store**](index.md)

---

# @saflib/secret-store

## Classes

| Class                                                       | Description                                                                             |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| [EnvSecretNotFoundError](classes/EnvSecretNotFoundError.md) | Returned when `process.env[name]` is missing or blank.                                  |
| [EnvSecretStore](classes/EnvSecretStore.md)                 | Resolves secrets from `process.env` by variable name.                                   |
| [SecretNotDeclaredError](classes/SecretNotDeclaredError.md) | Returned when `getSecretByName` is called for a name not in the package `secrets.json`. |
| [SecretStore](classes/SecretStore.md)                       | -                                                                                       |

## Type Aliases

| Type Alias                                                           | Description                                                                                                                                                  |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [CreateSecretStoreOptions](type-aliases/CreateSecretStoreOptions.md) | -                                                                                                                                                            |
| [SecretManifest](type-aliases/SecretManifest.md)                     | Package-local list of secrets this package may fetch.                                                                                                        |
| [SecretManifestEntry](type-aliases/SecretManifestEntry.md)           | One declared secret for a package's `secrets.json`.                                                                                                          |
| [SecretStoreError](type-aliases/SecretStoreError.md)                 | Union of errors returned by [SecretStore#getSecretByName](classes/SecretStore.md#getsecretbyname). Vendor backends may return additional `Error` subclasses. |

## Functions

| Function                                                          | Description                                                                                                                                                               |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [createSecretStore](functions/createSecretStore.md)               | Creates an env-backed [SecretStore](classes/SecretStore.md). For Infisical, use `@saflib/vendors-infisical`.                                                              |
| [getSecretStore](functions/getSecretStore.md)                     | Returns the store set by [setSecretStore](functions/setSecretStore.md).                                                                                                   |
| [hasSecretStore](functions/hasSecretStore.md)                     | Whether a process-level store has been set.                                                                                                                               |
| [isSecretDeclared](functions/isSecretDeclared.md)                 | Returns true when `name` appears in the package secrets manifest.                                                                                                         |
| [resetSecretStoreForTests](functions/resetSecretStoreForTests.md) | Test-only: clear the process-level store so configure / set can run again.                                                                                                |
| [setSecretStore](functions/setSecretStore.md)                     | Sets the process-level secret store. Idempotent — subsequent calls are no-ops. Vendor packages (e.g. `@saflib/vendors-infisical`) call this from their configure helpers. |
