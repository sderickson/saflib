[**@saflib/jobs-db**](../../index.md)

---

# Interface: JobResult

Outcome of a terminal or failed attempt; `error_body` only on failure (≤ 8 KB).

## Properties

### error\_body?

> `optional` **error\_body**: `null` \| `string`

---

### status\_code?

> `optional` **status\_code**: `number`

---

### terminal\_reason?

> `optional` **terminal\_reason**: `null` \| `"exhausted"` \| `"permanent-status"` \| `"rejected-by-endpoint"` \| `"auth-unresolvable"` \| `"cancelled-by-admin"` \| `"cancelled-by-chain"`
