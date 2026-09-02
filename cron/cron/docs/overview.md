# Overview

This library schedules jobs using [a cron interface](https://www.npmjs.com/package/cron). Jobs are disabled by default and can be turned on or off dynamically via API.

Related packages provide:

- Logging and metrics
- Admin page to enable/disable cron jobs and see who holds authority (`enabledBy`)

## Package Structure

See [base](https://github.com/sderickson/saflib/tree/main/base/service/cron).

## Authority

Enabling a cron job via the admin API records the calling admin's Kratos id in
`job_settings.enabled_by`. From then on, the enqueued job will be run under the
authority of that user.

## Related Packages

- [@saflib/cron-db](../../cron-db/docs/ref/index.md)
- [@saflib/cron-spec](../../cron-spec/docs/ref/index.md)
- [@saflib/cron-vue](../../cron-vue/docs/overview.md)
