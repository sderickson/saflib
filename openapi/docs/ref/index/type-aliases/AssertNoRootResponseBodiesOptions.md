[**@saflib/openapi**](../../index.md)

---

# Type Alias: AssertNoRootResponseBodiesOptions

> **AssertNoRootResponseBodiesOptions** = `object`

## Properties

### allow?

> `optional` **allow**: readonly [`RootResponseAllowKey`](RootResponseAllowKey.md)[]

Existing operations that still return a bare business object / array at the
JSON root. Format: `operationId:statusCode`. Unused entries fail so the
allowlist shrinks as routes are migrated.
