[**@saflib/cron-http**](../index.md)

***

# Interface: CronServiceOptions

Options to be passed when starting a cron service.

## Properties

### dbKey?

> `optional` **dbKey**: `symbol`

Key to be used to connect to the cron DB.

***

### dbOptions?

> `optional` **dbOptions**: `DbOptions`

Options to be passed to the cron DB, if dbKey is not provided.

***

### enqueueJob

> **enqueueJob**: [`CronEnqueuer`](../type-aliases/CronEnqueuer.md)

Enqueues a background job for a cron tick. Typically `makeCronEnqueuer`
from `@saflib/jobs`, wired by the product monolith.

***

### jobs

> **jobs**: [`JobsMap`](../type-aliases/JobsMap.md)

Map of job names to their configurations.
