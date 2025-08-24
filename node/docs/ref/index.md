**@saflib/node**

***

# @saflib/node

## Interfaces

| Interface | Description |
| ------ | ------ |
| [Auth](interfaces/Auth.md) | - |
| [ErrorCollectorParam](interfaces/ErrorCollectorParam.md) | - |
| [ErrorReportOptions](interfaces/ErrorReportOptions.md) | - |
| [LoggerOptions](interfaces/LoggerOptions.md) | - |
| [SafContext](interfaces/SafContext.md) | Static, serializable context about what's currently going on. These should always be available in backend systems. |
| [SafContextWithAuth](interfaces/SafContextWithAuth.md) | Convenience type for when the context needs to have auth. |
| [SafReporters](interfaces/SafReporters.md) | Clients for reporting various sorts of telemetry. They're expected to be instantiated with a SafContext, so that context is included. |

## Type Aliases

| Type Alias | Description |
| ------ | ------ |
| [ErrorCollector](type-aliases/ErrorCollector.md) | - |
| [ErrorLevels](type-aliases/ErrorLevels.md) | - |
| [ErrorReporter](type-aliases/ErrorReporter.md) | - |
| [LoggerContext](type-aliases/LoggerContext.md) | - |
| [SubsystemName](type-aliases/SubsystemName.md) | - |

## Variables

| Variable | Description |
| ------ | ------ |
| [consoleTransport](variables/consoleTransport.md) | - |
| [defaultErrorReporter](variables/defaultErrorReporter.md) | Default behavior when an exception is reported: - Add tags based on SafContext - Set default level to error - Ensure the "error" is an Error - Send to dedicated error collectors, and also log to the logger |
| [safContextStorage](variables/safContextStorage.md) | - |
| [safReportersStorage](variables/safReportersStorage.md) | - |
| [testContext](variables/testContext.md) | - |

## Functions

| Function | Description |
| ------ | ------ |
| [addErrorCollector](functions/addErrorCollector.md) | - |
| [addLokiTransport](functions/addLokiTransport.md) | - |
| [addSimpleStreamTransport](functions/addSimpleStreamTransport.md) | Adds a simple stream transport to the base logger. This is mainly used for testing; e.g. pass in a vi.fn(). Call `removeAllSimpleStreamTransports()` when done to clean up. |
| [addTransport](functions/addTransport.md) | For production, when the application starts, it should add any transports using this function. Then all SAF-based applications will log to winston and they'll propagate. |
| [collectSystemMetrics](functions/collectSystemMetrics.md) | - |
| [createLogger](functions/createLogger.md) | Creates a child logger with the specified request ID. Any servers or processors should use this to create a unique logger for each request or job or what have you. However, if not "instantiating" the request, you should use the request ID provided by the caller, such as in the proto envelope, so that requests which span processes can be correlated. |
| [createSilentLogger](functions/createSilentLogger.md) | - |
| [generateRequestId](functions/generateRequestId.md) | - |
| [getErrorCollectors](functions/getErrorCollectors.md) | - |
| [getSafContext](functions/getSafContext.md) | - |
| [getSafContextWithAuth](functions/getSafContextWithAuth.md) | - |
| [getSafReporters](functions/getSafReporters.md) | - |
| [getServiceName](functions/getServiceName.md) | - |
| [makeSubsystemErrorReporter](functions/makeSubsystemErrorReporter.md) | During setup, subsystems should use this to create their own set of reporters. "Operation name" should be the name of the function. |
| [makeSubsystemReporters](functions/makeSubsystemReporters.md) | - |
| [removeAllSimpleStreamTransports](functions/removeAllSimpleStreamTransports.md) | Call this at the end of a test that uses addSimpleStreamTransport. |
| [setServiceName](functions/setServiceName.md) | - |
