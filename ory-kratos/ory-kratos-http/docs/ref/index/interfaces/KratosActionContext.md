[**@saflib/ory-kratos-http**](../../index.md)

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

#### expires\_at?

> `optional` **expires\_at**: `string`

#### id?

> `optional` **id**: `string`

#### issued\_at?

> `optional` **issued\_at**: `string`

#### request\_url?

> `optional` **request\_url**: `string`

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

#### schema\_id?

> `optional` **schema\_id**: `string`

#### traits?

> `optional` **traits**: `Record`\<`string`, `unknown`>\>

---

### request\_cookies?

> `optional` **request\_cookies**: `Record`\<`string`, `string`>\>

---

### request\_headers?

> `optional` **request\_headers**: `Record`\<`string`, `string`[]\>

---

### request\_method?

> `optional` **request\_method**: `string`

---

### request\_url?

> `optional` **request\_url**: `string`

---

### session?

> `optional` **session**: `object`

#### Index Signature

\[`key`: `string`\]: `unknown`

#### id?

> `optional` **id**: `string`

#### identity\_id?

> `optional` **identity\_id**: `string`
