# Overview

This library enables services to schedule code to run using a cron-like interface. It's built on [the cron NPM package](https://www.npmjs.com/package/cron).

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

## Reference

Technically, these packages shouldn't be imported by anything but the `@saflib/cron`
package, but they're included here to aid development of the cron packages.

* [DB Reference](../../cron-db/docs/ref/index.md)