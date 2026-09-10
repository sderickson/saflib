[**@saflib/imports**](../../../../index.md)

---

# Interface: GenerateSnapshotOptions

## Properties

### onProgress()?

> `optional` **onProgress**: (`msg`) => `void`

Progress callback (e.g. CLI logging).

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `msg`     | `string` |

#### Returns

`void`

---

### outPath

> **outPath**: `string`

Absolute path to write the snapshot JSON.

---

### root?

> `optional` **root**: `string`

Monorepo root; auto-detected from cwd when omitted.

---

### skipBundles?

> `optional` **skipBundles**: `boolean`

Skip frontend bundle measurement.

---

### skipTimings?

> `optional` **skipTimings**: `boolean`

Skip suite / typecheck shell timings.
