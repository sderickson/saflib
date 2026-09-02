[**@saflib/ory-kratos**](../../index.md)

---

# Interface: KratosActionContext

Kratos webhook context as templated by `function(ctx) ctx`. Fields are
documented in https://www.ory.sh/docs/kratos/hooks/configure-hooks under
"Available web hook context". All fields are optional from saflib's
perspective: presence depends on which flow stage fired the hook (e.g.
`identity` is present on `after.<method>` hooks, absent on `before`).

`[key: string]: unknown` allows forward-compatible additions without
forcing saflib version bumps. Consumers narrow as they need.

## Indexable

\[`key`: `string`\]: `unknown`

## Properties

### flow?

> `optional` **flow**: `object`

#### Index Signature

\[`key`: `string`\]: `unknown`

#### active?

> `optional` **active**: `string`

#### expires_at?

> `optional` **expires_at**: `string`

#### id?

> `optional` **id**: `string`

#### issued_at?

> `optional` **issued_at**: `string`

#### request_url?

> `optional` **request_url**: `string`

#### state?

> `optional` **state**: `string`

#### type?

> `optional` **type**: `"browser"` \| `"api"`

---

### identity?

> `optional` **identity**: `object`

#### Index Signature

\[`key`: `string`\]: `unknown`

#### id?

> `optional` **id**: `string`

#### schema_id?

> `optional` **schema_id**: `string`

#### traits?

> `optional` **traits**: `Record`\<`string`, `unknown`\>

---

### request_cookies?

> `optional` **request_cookies**: `Record`\<`string`, `string`\>

---

### request_headers?

> `optional` **request_headers**: `Record`\<`string`, `string`[]\>

---

### request_method?

> `optional` **request_method**: `string`

---

### request_url?

> `optional` **request_url**: `string`

---

### session?

> `optional` **session**: `object`

#### Index Signature

\[`key`: `string`\]: `unknown`

#### id?

> `optional` **id**: `string`

#### identity_id?

> `optional` **identity_id**: `string`
