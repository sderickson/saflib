[**@saflib/cron**](../index.md)

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

### jobs

> **jobs**: [`JobsMap`](../type-aliases/JobsMap.md)

Map of job names to their configurations.
