[**@saflib/jobs-db**](../../index.md)

---

# Type Alias: JobAuthority

> **JobAuthority** = \{ `assertion`: [`JobAuthorityAssertion`](../interfaces/JobAuthorityAssertion.md); `kind`: `"request"`; `request_id`: `string`; `user_id`: `string`; \} \| \{ `assertion`: [`JobAuthorityAssertion`](../interfaces/JobAuthorityAssertion.md); `importer_id`: `string`; `kind`: `"importer"`; `user_id`: `string`; \} \| \{ `assertion`: [`JobAuthorityAssertion`](../interfaces/JobAuthorityAssertion.md); `cron_job_name`: `string`; `kind`: `"cron"`; `user_id`: `string`; \}

Root grant for the job chain, including the embedded enqueue assertion.
Wire form omits `assertion` (returned separately as `authority_assertion`).
