[**@saflib/imports**](../../../../index.md)

---

# Interface: DiffBaselineOptions

## Properties

### baselinePath

> **baselinePath**: `string`

Path to committed baseline JSON.

---

### moduleThreshold?

> `optional` **moduleThreshold**: `number`

Module-count regression threshold (default 0.05 = 5%).

---

### onProgress()?

> `optional` **onProgress**: (`msg`) => `void`

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `msg`     | `string` |

#### Returns

`void`

---

### root?

> `optional` **root**: `string`

Monorepo root; auto-detected from cwd when omitted.

---

### timingThreshold?

> `optional` **timingThreshold**: `number`

Timing regression threshold (default 0.10 = 10%).
