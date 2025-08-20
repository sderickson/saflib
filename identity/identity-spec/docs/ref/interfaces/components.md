[**@saflib/identity-spec**](../index.md)

***

# Interface: components

## Properties

### headers

> **headers**: `never`

***

### parameters

> **parameters**: `never`

***

### pathItems

> **pathItems**: `never`

***

### requestBodies

> **requestBodies**: `never`

***

### responses

> **responses**: `never`

***

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

#### Error

> **Error**: `object`

##### Error.code?

> `optional` **code**: `string`

###### Description

A short, machine-readable error code, for when HTTP status codes are not sufficient.

##### Error.message?

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

##### sent-email.replyTo?

> `optional` **replyTo**: `string`[]

##### sent-email.subject

> **subject**: `string`

##### sent-email.text?

> `optional` **text**: `string`

##### sent-email.timeSent?

> `optional` **timeSent**: `number`

##### sent-email.to

> **to**: `string`[]

#### user

> **user**: `object`

##### user.createdAt?

> `optional` **createdAt**: `string`

Format: date-time

###### Description

Date and time the user was created

##### user.email?

> `optional` **email**: `string`

Format: email

##### user.emailVerified?

> `optional` **emailVerified**: `boolean`

###### Description

Whether the user's email address has been verified

##### user.familyName?

> `optional` **familyName**: `string`

###### Description

User's family name (optional)

##### user.givenName?

> `optional` **givenName**: `string`

###### Description

User's given name (optional)

##### user.id?

> `optional` **id**: `number`

##### user.lastLoginAt?

> `optional` **lastLoginAt**: `string`

Format: date-time

###### Description

Date and time the user last logged in

##### user.name?

> `optional` **name**: `string`

###### Description

User's full name (optional)

##### user.scopes?

> `optional` **scopes**: `string`[]

###### Description

List of user's permission scopes

##### user.verifiedAt?

> `optional` **verifiedAt**: `string`

Format: date-time

###### Description

Date and time the user's email was verified

#### User

> **User**: `object`

##### User.createdAt?

> `optional` **createdAt**: `string`

Format: date-time

###### Description

Date and time the user was created

##### User.email?

> `optional` **email**: `string`

Format: email

##### User.emailVerified?

> `optional` **emailVerified**: `boolean`

###### Description

Whether the user's email address has been verified

##### User.familyName?

> `optional` **familyName**: `string`

###### Description

User's family name (optional)

##### User.givenName?

> `optional` **givenName**: `string`

###### Description

User's given name (optional)

##### User.id?

> `optional` **id**: `number`

##### User.lastLoginAt?

> `optional` **lastLoginAt**: `string`

Format: date-time

###### Description

Date and time the user last logged in

##### User.name?

> `optional` **name**: `string`

###### Description

User's full name (optional)

##### User.scopes?

> `optional` **scopes**: `string`[]

###### Description

List of user's permission scopes

##### User.verifiedAt?

> `optional` **verifiedAt**: `string`

Format: date-time

###### Description

Date and time the user's email was verified
