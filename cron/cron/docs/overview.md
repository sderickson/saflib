# Overview

This library enables services to schedule functions to run regularly using a cron-like interface. It's built on [the cron NPM package](https://www.npmjs.com/package/cron). It and related packages provide:

* Logging and metrics
* Admin page, with the ability to enable/disable cron jobs dynamically

## Package Structure

Each package which depends on `@saflib/cron` should have the following structure:

```
{service-name}-cron/
├── cron.ts
├── jobs/
│   └── {group-1}/
│   │   ├── index.ts
│   │   ├── job-1.test.ts
│   │   ├── job-1.ts
│   │   ├── job-2.test.ts
│   │   ├── job-2.ts
│   │   └── ...
│   ├── {group-2}/
│   └── ...
├── package.json
```

## Files and Directories Explained

### `cron.ts`

Exports cron jobs and runner. It should export all jobs into one large `JobsMap` instance, and a function which runs `runCron` with those same jobs (typically called `run<ServiceName>Cron`). The reason to export a function runner is those jobs may require context which that function should provide.

### `jobs/`

Jobs should be organized into directories, with an index.ts file for
each group. These index.ts files should export `JobsMap` instances
which `cron.ts` will import and merge together. Each job file will
export the handler.

## Related Packages

### Public

To manage cron jobs, render the page provided by [`@saflib/cron-vue`](../../cron-vue/docs/overview.md)

### Private

For development of the cron packages.

* [@saflib/cron-db](../../cron-db/docs/ref/index.md)
* [@saflib/cron-spec](../../cron-spec/docs/ref/index.md)