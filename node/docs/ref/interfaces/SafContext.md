[**@saflib/node**](../index.md)

***

# Interface: SafContext

Static, serializable context about what's currently going on.
These should always be available in backend systems.

## Extended by

- [`SafContextWithAuth`](SafContextWithAuth.md)

## Properties

### auth?

> `optional` **auth**: [`Auth`](Auth.md)

***

### operationName

> **operationName**: `string`

***

### requestId?

> `optional` **requestId**: `string`

***

### serviceName

> **serviceName**: `string`

***

### subsystemName

> **subsystemName**: [`SubsystemName`](../type-aliases/SubsystemName.md)
