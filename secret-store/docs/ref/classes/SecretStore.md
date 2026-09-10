[**@saflib/secret-store**](../index.md)

---

# Abstract Class: SecretStore

## Extended by

- [`EnvSecretStore`](EnvSecretStore.md)

## Constructors

### Constructor

> **new SecretStore**(): `SecretStore`

#### Returns

`SecretStore`

## Methods

### fetchSecretByName()

> `abstract` `protected` **fetchSecretByName**(`name`): `Promise`\<`ReturnsError`\<`string`, [`SecretStoreError`](../type-aliases/SecretStoreError.md)>>\>\>

Backend-specific fetch; only called after manifest validation.

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `name`    | `string` |

#### Returns

`Promise`\<`ReturnsError`\<`string`, [`SecretStoreError`](../type-aliases/SecretStoreError.md)\>\>

---

### getSecretByName()

> **getSecretByName**(`name`, `packageSecrets`): `Promise`\<`ReturnsError`\<`string`, [`SecretStoreError`](../type-aliases/SecretStoreError.md)>>\>\>

Fetch a secret by name after checking it is declared in `packageSecrets`
(typically the package's `secrets.json`).

#### Parameters

| Parameter        | Type                                                  |
| ---------------- | ----------------------------------------------------- |
| `name`           | `string`                                              |
| `packageSecrets` | [`SecretManifest`](../type-aliases/SecretManifest.md) |

#### Returns

`Promise`\<`ReturnsError`\<`string`, [`SecretStoreError`](../type-aliases/SecretStoreError.md)\>\>
