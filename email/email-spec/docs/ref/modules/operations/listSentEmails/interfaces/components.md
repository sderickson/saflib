[**@saflib/email-spec**](../../../../index.md)

---

# Interface: components

## Properties

### headers

> **headers**: `never`

---

### parameters

> **parameters**: `never`

---

### pathItems

> **pathItems**: `never`

---

### requestBodies

> **requestBodies**: `never`

---

### responses

> **responses**: `never`

---

### schemas

> **schemas**: `object`

#### error

> **error**: `object`

##### error.code?

> `optional` **code**: `string`

###### Description

A short, machine-readable error code, for when HTTP status codes are not sufficient.

##### error.message?

> `optional` **message**: `string`

###### Description

A human-readable description of the error.

###### Example

```ts
The requested resource could not be found.
```

#### sent-email

> **sent-email**: `object`

##### sent-email.attachments?

> `optional` **attachments**: `string`[]

##### sent-email.bcc?

> `optional` **bcc**: `string`[]

##### sent-email.cc?

> `optional` **cc**: `string`[]

##### sent-email.from

> **from**: `string`

##### sent-email.html?

> `optional` **html**: `string`

##### sent-email.reply\_to?

> `optional` **reply\_to**: `string`[]

##### sent-email.subject

> **subject**: `string`

##### sent-email.text?

> `optional` **text**: `string`

##### sent-email.time\_sent?

> `optional` **time\_sent**: `number`

##### sent-email.to

> **to**: `string`[]
