[**@saflib/secret-store**](../index.md)

---

# Type Alias: SecretStoreError

> **SecretStoreError** = [`EnvSecretNotFoundError`](../classes/EnvSecretNotFoundError.md) \| [`SecretNotDeclaredError`](../classes/SecretNotDeclaredError.md) \| `Error`

Union of errors returned by [SecretStore#getSecretByName](../classes/SecretStore.md#getsecretbyname).
Vendor backends may return additional `Error` subclasses.
