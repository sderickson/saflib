[**@saflib/ory-kratos-http**](../../index.md)

---

# Interface: RegistrationCodeValidPayload

## Extends

- `BaseKratosCourierPayload`

## Properties

### expiresInMinutes?

> `optional` **expiresInMinutes**: `number`

---

### recipient

> **recipient**: `string`

#### Inherited from

`BaseKratosCourierPayload.recipient`

---

### registrationCode

> **registrationCode**: `string`

---

### registrationUrl?

> `optional` **registrationUrl**: `string`

---

### templateData

> **templateData**: `Record`\<`string`, `unknown`>\>

Original `template_data` from the HTTP courier body.

#### Inherited from

`BaseKratosCourierPayload.templateData`

---

### user

> **user**: [`User`](User.md)

#### Inherited from

`BaseKratosCourierPayload.user`
