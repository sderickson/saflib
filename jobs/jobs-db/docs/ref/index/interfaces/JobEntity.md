[**@saflib/jobs-db**](../../index.md)

---

# Interface: JobEntity

## Properties

### attempt

> **attempt**: `number`

---

### authority

> **authority**: [`JobAuthority`](../type-aliases/JobAuthority.md)

---

### concurrency\_key

> **concurrency\_key**: `null` \| `string`

---

### created\_at

> **created\_at**: `Date`

---

### dedupe\_key

> **dedupe\_key**: `null` \| `string`

---

### enqueued\_by\_operation\_id

> **enqueued\_by\_operation\_id**: `string`

---

### finished\_at

> **finished\_at**: `null` \| `Date`

---

### heartbeat\_at

> **heartbeat\_at**: `null` \| `Date`

---

### id

> **id**: `string`

---

### max\_attempts

> **max\_attempts**: `number`

---

### operation\_id

> **operation\_id**: `string`

---

### original\_request\_id

> **original\_request\_id**: `string`

---

### parent\_job\_id

> **parent\_job\_id**: `null` \| `string`

---

### priority

> **priority**: `number`

---

### request

> **request**: [`JobRequest`](JobRequest.md)

---

### result

> **result**: `null` \| [`JobResult`](JobResult.md)

---

### run\_at

> **run\_at**: `Date`

---

### started\_at

> **started\_at**: `null` \| `Date`

---

### status

> **status**: `"pending"` \| `"running"` \| `"retrying"` \| `"succeeded"` \| `"dead"` \| `"cancelled"`

---

### updated\_at

> **updated\_at**: `Date`

---

### user\_id

> **user\_id**: `string`
