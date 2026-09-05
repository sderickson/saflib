**@saflib/cron-db**

---

# @saflib/cron-db

## Classes

| Class                                                         | Description                               |
| ------------------------------------------------------------- | ----------------------------------------- |
| [CronDatabaseError](classes/CronDatabaseError.md)             | Superclass for all handled cron db errors |
| [JobSettingNotFoundError](classes/JobSettingNotFoundError.md) | Superclass for all handled cron db errors |

## Interfaces

| Interface                              | Description                                   |
| -------------------------------------- | --------------------------------------------- |
| [JobSetting](interfaces/JobSetting.md) | The current state and settings of a cron job. |

## Type Aliases

| Type Alias                                                       | Description |
| ---------------------------------------------------------------- | ----------- |
| [GetAllResult](type-aliases/GetAllResult.md)                     | -           |
| [GetByNameResult](type-aliases/GetByNameResult.md)               | -           |
| [SetEnabledResult](type-aliases/SetEnabledResult.md)             | -           |
| [SetLastRunStatusResult](type-aliases/SetLastRunStatusResult.md) | -           |

## Variables

| Variable                                          | Description                                                                                                                                                                                          |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [cronDb](variables/cronDb.md)                     | For managing connections to the cron database.                                                                                                                                                       |
| [getAll](variables/getAll.md)                     | -                                                                                                                                                                                                    |
| [getByName](variables/getByName.md)               | -                                                                                                                                                                                                    |
| [setEnabled](variables/setEnabled.md)             | Upsert enabled flag for a cron job. When enabling, pass `enabledBy` (Kratos identity id) to record authority. When disabling, `enabled_by` is retained as an audit trail of who last held authority. |
| [setLastRunStatus](variables/setLastRunStatus.md) | -                                                                                                                                                                                                    |
