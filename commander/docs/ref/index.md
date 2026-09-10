**@saflib/commander**

---

# @saflib/commander

## Interfaces

| Interface                                                | Description                  |
| -------------------------------------------------------- | ---------------------------- |
| [CliContext](interfaces/CliContext.md)                   | -                            |
| [CliReporters](interfaces/CliReporters.md)               | -                            |
| [SetupContextOptions](interfaces/SetupContextOptions.md) | CLI runtime context options. |

## Functions

| Function                                        | Description                                                                        |
| ----------------------------------------------- | ---------------------------------------------------------------------------------- |
| [getCliContext](functions/getCliContext.md)     | Read the active CLI context. Throws outside `setupContext` unless `NODE_ENV=test`. |
| [getCliReporters](functions/getCliReporters.md) | Read the active CLI reporters. Falls back to silent defaults in tests.             |
| [setupContext](functions/setupContext.md)       | Builds and runs CLI context and reporter storage for commander programs.           |
