[**@saflib/drizzle**](../index.md)

---

# Type Alias: Equal\<X, Y\>

> **Equal**\<`X`, `Y`\> = \<`T`\>() => `T` _extends_ `X` ? `1` : `2` _extends_ \<`T`\>() => `T` _extends_ `Y` ? `1` : `2` ? `true` : `false`

To be used with "Expect" to check explicit table interfaces match Drizzle's inferred interfaces.

## Type Parameters

| Type Parameter |
| -------------- |
| `X`            |
| `Y`            |
