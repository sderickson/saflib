[**@saflib/vendors-infisical**](../index.md)

---

# index

## Classes

| Class                                                               | Description                                                                      |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| [InfisicalNetworkError](classes/InfisicalNetworkError.md)           | Network or request failure (e.g. connection refused, timeout).                   |
| [InfisicalNotFoundError](classes/InfisicalNotFoundError.md)         | Secret was not found (e.g. SDK 404).                                             |
| [InfisicalSecretStore](classes/InfisicalSecretStore.md)             | Resolves secrets via the Infisical API using credentials supplied by the caller. |
| [InfisicalUnauthorizedError](classes/InfisicalUnauthorizedError.md) | Unauthorized — invalid or missing token (e.g. SDK 401/403).                      |

## Type Aliases

| Type Alias                                                                 | Description                                                                  |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| [InfisicalClientError](type-aliases/InfisicalClientError.md)               | Union of Infisical client errors for `ReturnsError` and exhaustive switches. |
| [InfisicalSecretStoreOptions](type-aliases/InfisicalSecretStoreOptions.md) | -                                                                            |

## Functions

| Function                                                              | Description                                                                                                                                                                   |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [configureSecretStore](functions/configureSecretStore.md)             | Initializes the process-level secret store from Infisical env (`INFISICAL_TOKEN`, `INFISICAL_PROJECT_ID`, `INFISICAL_ENVIRONMENT`). Idempotent — subsequent calls are no-ops. |
| [createInfisicalSecretStore](functions/createInfisicalSecretStore.md) | Convenience factory for Infisical-backed stores.                                                                                                                              |
| [getSecretStore](functions/getSecretStore.md)                         | Returns the store set by setSecretStore.                                                                                                                                      |
| [resetSecretStoreForTests](functions/resetSecretStoreForTests.md)     | Test-only: clear the process-level store so configure / set can run again.                                                                                                    |
