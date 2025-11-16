[**@saflib/openapi**](../../index.md)

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

#### address

> **address**: `object`

##### Description

A shared address type that can be used across the platform

##### Example

```ts
{
         *       "formatted": "123 Main St, Anytown, ST 12345, USA",
         *       "street_address": "123 Main St",
         *       "locality": "Anytown",
         *       "region": "ST",
         *       "country": "USA",
         *       "postal_code": "12345"
         *     }
```

##### address.country?

> `optional` **country**: `null` \| `string`

###### Description

Country name

###### Example

```ts
USA;
```

##### address.formatted?

> `optional` **formatted**: `null` \| `string`

###### Description

Complete formatted address string

###### Example

```ts
123 Main St, Anytown, ST 12345, USA
```

##### address.locality?

> `optional` **locality**: `null` \| `string`

###### Description

City or town name

###### Example

```ts
Anytown;
```

##### address.postal_code?

> `optional` **postal_code**: `null` \| `string`

###### Description

ZIP or postal code

###### Example

```ts
12345;
```

##### address.region?

> `optional` **region**: `null` \| `string`

###### Description

State, province, or region

###### Example

```ts
ST;
```

##### address.street_address?

> `optional` **street_address**: `null` \| `string`

###### Description

Street address line

###### Example

```ts
123 Main St
```

#### Address

> **Address**: `object`

##### Address.country?

> `optional` **country**: `null` \| `string`

###### Description

Country name

###### Example

```ts
USA;
```

##### Address.formatted?

> `optional` **formatted**: `null` \| `string`

###### Description

Complete formatted address string

###### Example

```ts
123 Main St, Anytown, ST 12345, USA
```

##### Address.locality?

> `optional` **locality**: `null` \| `string`

###### Description

City or town name

###### Example

```ts
Anytown;
```

##### Address.postal_code?

> `optional` **postal_code**: `null` \| `string`

###### Description

ZIP or postal code

###### Example

```ts
12345;
```

##### Address.region?

> `optional` **region**: `null` \| `string`

###### Description

State, province, or region

###### Example

```ts
ST;
```

##### Address.street_address?

> `optional` **street_address**: `null` \| `string`

###### Description

Street address line

###### Example

```ts
123 Main St
```

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
