[**@saflib/workflows**](../index.md)

---

# Interface: UpdateStepTest

A simple test format on changes made, for checks beyond just "todo" string existence.

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

An arbitrary test, given the contents of the file that was updated. Fails the test if it returns false.

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `content` | `string` |

#### Returns

`boolean`
