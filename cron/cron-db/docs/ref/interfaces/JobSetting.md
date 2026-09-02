[**@saflib/cron-db**](../index.md)

---

# Interface: JobSetting

The current state and settings of a cron job.

## Properties

### created_at

> **created_at**: `Date`

---

### enabled

> **enabled**: `boolean`

---

### enabled_by

> **enabled_by**: `null` \| `string`

Kratos identity id of the admin who last enabled the job; null until re-enabled post-migration.

---

### id

> **id**: `number`

---

### job_name

> **job_name**: `string`

---

### last_run_at

> **last_run_at**: `null` \| `Date`

---

### last_run_status

> **last_run_status**: `null` \| `"success"` \| `"fail"` \| `"running"` \| `"timed out"`

---

### updated_at

> **updated_at**: `Date`
