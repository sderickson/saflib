[**@saflib/jobs-http**](../index.md)

---

# Interface: EnqueueOnBehalfOfParams

## Extends

- [`EnqueueParams`](EnqueueParams.md)

## Properties

### authority

> **authority**: \{ `kind`: `"request"`; `request_id`: `string`; `user_id`: `string`; \} \| \{ `kind`: `"resource"`; `resource_id`: `string`; `user_id`: `string`; \} \| \{ `cron_job_name`: `string`; `kind`: `"cron"`; `user_id`: `string`; \}

#### Type declaration

\{ `kind`: `"request"`; `request_id`: `string`; `user_id`: `string`; \}

#### kind

> **kind**: `"request"`

##### Example

```ts
request
@enum {string}
```

#### request\_id

> **request\_id**: `string`

##### Description

Originating request id (e.g. X-Request-ID).

##### Example

```ts
r - abc123;
```

#### user\_id

> **user\_id**: `string`

##### Description

User who made the originating request.

##### Example

```ts
Us7k_pQ2;
```

\{ `kind`: `"resource"`; `resource_id`: `string`; `user_id`: `string`; \}

#### kind

> **kind**: `"resource"`

##### Example

```ts
resource
@enum {string}
```

#### resource\_id

> **resource\_id**: `string`

##### Description

Short id of the resource row that authorized the chain.

##### Example

```ts
Rs7k_mN2;
```

#### user\_id

> **user\_id**: `string`

##### Description

Owner of the resource whose authority is used.

##### Example

```ts
Us7k_pQ2;
```

\{ `cron_job_name`: `string`; `kind`: `"cron"`; `user_id`: `string`; \}

#### cron\_job\_name

> **cron\_job\_name**: `string`

##### Description

Name of the cron job that enqueued this chain.

##### Example

```ts
recoverySweep;
```

#### kind

> **kind**: `"cron"`

##### Example

```ts
cron
@enum {string}
```

#### user\_id

> **user\_id**: `string`

##### Description

Admin who enabled the cron job (`enabled_by`).

##### Example

```ts
Us7k_pQ2;
```

---

### concurrency\_key?

> `optional` **concurrency\_key**: `null` \| `string`

#### Inherited from

[`EnqueueParams`](EnqueueParams.md).[`concurrency_key`](EnqueueParams.md#concurrency_key)

---

### dedupe\_key?

> `optional` **dedupe\_key**: `null` \| `string`

#### Inherited from

[`EnqueueParams`](EnqueueParams.md).[`dedupe_key`](EnqueueParams.md#dedupe_key)

---

### delay\_ms?

> `optional` **delay\_ms**: `number`

#### Inherited from

[`EnqueueParams`](EnqueueParams.md).[`delay_ms`](EnqueueParams.md#delay_ms)

---

### operation\_id

> **operation\_id**: `string`

#### Inherited from

[`EnqueueParams`](EnqueueParams.md).[`operation_id`](EnqueueParams.md#operation_id)

---

### priority?

> `optional` **priority**: `number`

#### Inherited from

[`EnqueueParams`](EnqueueParams.md).[`priority`](EnqueueParams.md#priority)

---

### request?

> `optional` **request**: `object`

#### body?

> `optional` **body**: `unknown`

##### Description

JSON request body for the target operation, when any.

#### path\_params?

> `optional` **path\_params**: `object`

##### Index Signature

\[`key`: `string`\]: `unknown`

##### Description

Path template substitutions keyed by parameter name.

#### query?

> `optional` **query**: `object`

##### Index Signature

\[`key`: `string`\]: `unknown`

##### Description

Query string parameters keyed by name.

#### Inherited from

[`EnqueueParams`](EnqueueParams.md).[`request`](EnqueueParams.md#request)

---

### run\_at?

> `optional` **run\_at**: `string`

#### Inherited from

[`EnqueueParams`](EnqueueParams.md).[`run_at`](EnqueueParams.md#run_at)

---

### user\_id

> **user\_id**: `string`
