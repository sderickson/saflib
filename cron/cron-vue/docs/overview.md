# @saflib/cron-vue

This package exports a `CronJobsPage` for your admin SPA. It lets you view cron
status and enable/disable individual jobs.

The page talks to the product API host (`api`) via the shared client in
`client.ts` — mount the `@saflib/cron` Express router on that same service so the
`/cron/*` routes are available.
