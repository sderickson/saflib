**@saflib/cron-service**

***

# @saflib/cron-service

## Interfaces

| Interface | Description |
| ------ | ------ |
| [CronServiceOptions](interfaces/CronServiceOptions.md) | Options to be passed when starting a cron service. |
| [CustomLogErrorMeta](interfaces/CustomLogErrorMeta.md) | Data passed to the error callback. |
| [JobConfig](interfaces/JobConfig.md) | Configuration for a single cron job. |

## Type Aliases

| Type Alias | Description |
| ------ | ------ |
| [CustomLogError](type-aliases/CustomLogError.md) | Callback for handling when a job throws an error. |
| [JobsMap](type-aliases/JobsMap.md) | Map of job names to their configurations. |

## Functions

| Function | Description |
| ------ | ------ |
| [createCronRouter](functions/createCronRouter.md) | Creates a router that your own Express app can include, in order to serve cron API endpoints. These provide runtime information and the ability do enable/disable cron jobs. They are only accessible to admin users. |
| [runCron](functions/runCron.md) | Runs the cron jobs until the process is killed. |
