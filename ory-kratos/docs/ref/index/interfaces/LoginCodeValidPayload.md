[**@saflib/ory-kratos**](../../index.md)

---

# Interface: LoginCodeValidPayload

## Extends

- `BaseKratosCourierPayload`

## Properties

### expiresInMinutes?

> `optional` **expiresInMinutes**: `number`

---

### loginCode

> **loginCode**: `string`

---

### loginUrl?

> `optional` **loginUrl**: `string`

---

### recipient

> **recipient**: `string`

#### Inherited from

`BaseKratosCourierPayload.recipient`

---

### templateData

> **templateData**: `Record`\<`string`, `unknown`\>

Original `template_data` from the HTTP courier body.

#### Inherited from

`BaseKratosCourierPayload.templateData`

---

### user

> **user**: [`User`](User.md)

#### Inherited from

`BaseKratosCourierPayload.user`
