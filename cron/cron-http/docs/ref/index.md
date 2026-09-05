**@saflib/cron-http**

---

# @saflib/cron-http

## Interfaces

| Interface                                              | Description                                                                                                                                      |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| [CronEnqueueParams](interfaces/CronEnqueueParams.md)   | Params for one cron-tick enqueue. Mirrored by `@saflib/jobs-http` `makeCronEnqueuer` so `@saflib/cron-http` does not import `@saflib/jobs-http`. |
| [CronEnqueueResult](interfaces/CronEnqueueResult.md)   | -                                                                                                                                                |
| [CronJobRequest](interfaces/CronJobRequest.md)         | Static request payload for the operation a cron tick enqueues. Dynamic fan-out belongs in the target handler.                                    |
| [CronServiceOptions](interfaces/CronServiceOptions.md) | Options to be passed when starting a cron service.                                                                                               |
| [CustomLogErrorMeta](interfaces/CustomLogErrorMeta.md) | Data passed to the error callback.                                                                                                               |
| [JobConfig](interfaces/JobConfig.md)                   | Configuration for a single cron job. Cron ticks only enqueue; work runs through the target background operation.                                 |

## Type Aliases

| Type Alias                                       | Description                                       |
| ------------------------------------------------ | ------------------------------------------------- |
| [CronEnqueuer](type-aliases/CronEnqueuer.md)     | -                                                 |
| [CustomLogError](type-aliases/CustomLogError.md) | Callback for handling when a job throws an error. |
| [JobsMap](type-aliases/JobsMap.md)               | Map of job names to their configurations.         |

## Functions

| Function                                          | Description                                                                                                                                                                                                           |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [createCronRouter](functions/createCronRouter.md) | Creates a router that your own Express app can include, in order to serve cron API endpoints. These provide runtime information and the ability do enable/disable cron jobs. They are only accessible to admin users. |
| [runCron](functions/runCron.md)                   | Runs the cron jobs until the process is killed. Returns an array of cron jobs.                                                                                                                                        |
