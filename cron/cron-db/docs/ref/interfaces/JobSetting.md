[**@saflib/cron-db**](../index.md)

---

# Interface: JobSetting

The current state and settings of a cron job.

## Properties

### created\_at

> **created\_at**: `Date`

---

### enabled

> **enabled**: `boolean`

---

### enabled\_by

> **enabled\_by**: `null` \| `string`

Kratos identity id of the admin who last enabled the job; null until re-enabled post-migration.

---

### id

> **id**: `number`

---

### job\_name

> **job\_name**: `string`

---

### last\_run\_at

> **last\_run\_at**: `null` \| `Date`

---

### last\_run\_status

> **last\_run\_status**: `null` \| `"success"` \| `"fail"` \| `"running"` \| `"timed out"`

---

### updated\_at

> **updated\_at**: `Date`
