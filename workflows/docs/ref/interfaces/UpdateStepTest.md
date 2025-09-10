[**@saflib/workflows**](../index.md)

---

# Interface: UpdateStepTest

## Properties

### description

> **description**: `string`

What to print if the test fails.

---

### name

> **name**: `string`

The name of the test.

---

### test()

> **test**: (`content`) => `boolean`

An arbitrary test. Fails the test if it returns false.

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `content` | `string` |

#### Returns

`boolean`
