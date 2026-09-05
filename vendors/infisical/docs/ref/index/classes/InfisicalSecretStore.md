[**@saflib/vendors-infisical**](../../index.md)

---

# Class: InfisicalSecretStore

Resolves secrets via the Infisical API using credentials supplied by the caller.

## Extends

- `SecretStore`

## Constructors

### Constructor

> **new InfisicalSecretStore**(`options`): `InfisicalSecretStore`

#### Parameters

| Parameter | Type                                                                            |
| --------- | ------------------------------------------------------------------------------- |
| `options` | [`InfisicalSecretStoreOptions`](../type-aliases/InfisicalSecretStoreOptions.md) |

#### Returns

`InfisicalSecretStore`

#### Overrides

`SecretStore.constructor`

## Methods

### fetchSecretByName()

> `protected` **fetchSecretByName**(`name`): `Promise`\<`ReturnsError`\<`string`, `SecretStoreError`>>\>\>

Backend-specific fetch; only called after manifest validation.

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `name`    | `string` |

#### Returns

`Promise`\<`ReturnsError`\<`string`, `SecretStoreError`\>\>

#### Overrides

`SecretStore.fetchSecretByName`

---

### getSecretByName()

> **getSecretByName**(`name`, `packageSecrets`): `Promise`\<`ReturnsError`\<`string`, `SecretStoreError`>>\>\>

Fetch a secret by name after checking it is declared in `packageSecrets`
(typically the package's `secrets.json`).

#### Parameters

| Parameter        | Type             |
| ---------------- | ---------------- |
| `name`           | `string`         |
| `packageSecrets` | `SecretManifest` |

#### Returns

`Promise`\<`ReturnsError`\<`string`, `SecretStoreError`\>\>

#### Inherited from

`SecretStore.getSecretByName`
