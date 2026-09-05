[**@saflib/secret-store**](../index.md)

---

# Class: EnvSecretStore

Resolves secrets from `process.env` by variable name.

## Extends

- [`SecretStore`](SecretStore.md)

## Constructors

### Constructor

> **new EnvSecretStore**(): `EnvSecretStore`

#### Returns

`EnvSecretStore`

#### Inherited from

[`SecretStore`](SecretStore.md).[`constructor`](SecretStore.md#constructor)

## Methods

### fetchSecretByName()

> `protected` **fetchSecretByName**(`name`): `Promise`\<`ReturnsError`\<`string`, [`SecretStoreError`](../type-aliases/SecretStoreError.md)>>\>\>

Backend-specific fetch; only called after manifest validation.

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `name`    | `string` |

#### Returns

`Promise`\<`ReturnsError`\<`string`, [`SecretStoreError`](../type-aliases/SecretStoreError.md)\>\>

#### Overrides

[`SecretStore`](SecretStore.md).[`fetchSecretByName`](SecretStore.md#fetchsecretbyname)

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

#### Inherited from

[`SecretStore`](SecretStore.md).[`getSecretByName`](SecretStore.md#getsecretbyname)
