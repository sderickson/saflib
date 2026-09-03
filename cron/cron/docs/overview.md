# Overview

This library schedules jobs using [a cron interface](https://www.npmjs.com/package/cron). Jobs are disabled by default and can be turned on or off dynamically via API.

The cron suite of packages provide:

- Logging and metrics
- Admin page to enable/disable cron jobs and see who holds authority (`enabledBy`)

## Package Structure and Integration

See [base](https://github.com/sderickson/saflib/tree/main/base/service/cron), which defines cron jobs. The expected way to integrate these into your service is:

- Have the monolith run cron jobs as part of its startup process.
- Add the cron job router to the http express server for administration.
- Add the cron jobs page to the admin SPA.

## Relationship with Jobs

The cron service only enqueues jobs on a regular interval. See the [jobs package](../../jobs/docs/overview.md) for more details on how to define background jobs in your service and allow cron to enqueue them.

## Authority

Enabling a cron job via the admin API records the calling admin's Kratos id in
`job_settings.enabled_by`. From then on, the enqueued job will be run under the
authority of that user.

## Related Packages

- [@saflib/cron-db](../../cron-db/docs/ref/index.md)
- [@saflib/cron-spec](../../cron-spec/docs/ref/index.md)
- [@saflib/cron-vue](../../cron-vue/docs/ref/components/index.md)
