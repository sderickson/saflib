# @saflib/cron-vue

This package exports just a `CronJobsPage` which should be added to the vue router
for your admin SPA. This page will let you view cron status and enable/disable
individual jobs.

For this to work, the service with the cron jobs needs to run a `@saflib/express`
instance on a subdomain, which uses the Express router provided by `@saflib/cron`.
The `CronJobsPage` takes as a property a subdomain which it should target to find
these cron API routes.
