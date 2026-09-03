# Overview

This suite schedules jobs using [a cron interface](https://www.npmjs.com/package/cron). Jobs are disabled by default and can be turned on or off dynamically via API.

The cron suite provides:

- Logging and metrics
- Admin page to enable/disable cron jobs and see who holds authority (`enabledBy`)

## Package structure and integration

See [base](https://github.com/sderickson/saflib/tree/main/base/service/cron), which defines cron jobs. The expected way to integrate these into your service is:

- Have the monolith run cron jobs as part of its startup process.
- Add the cron job router to the HTTP express server for administration.
- Add the cron jobs page to the admin SPA.

## Relationship with jobs

The cron service only enqueues jobs on a regular interval. See the [jobs package](../../jobs/docs/overview.md) for more details on how to define background jobs in your service and allow cron to enqueue them.

## Authority

Enabling a cron job via the admin API records the calling admin's Kratos id in
`job_settings.enabled_by`. From then on, the enqueued job will be run under the
authority of that user.

## Packages

See [packages](./packages.md) for links to each package in this suite.
