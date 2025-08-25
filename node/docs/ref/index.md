**@saflib/node**

***

# @saflib/node

## Interfaces

| Interface | Description |
| ------ | ------ |
| [Auth](interfaces/Auth.md) | Auth object passed in with every authenticated request. |
| [ErrorCollectorParam](interfaces/ErrorCollectorParam.md) | Parameters provided to error collectors. |
| [ErrorReportOptions](interfaces/ErrorReportOptions.md) | Subset of properties given to Sentry or similar error reporting services. https://docs.sentry.io/platforms/javascript/guides/node/apis/#captureException |
| [LoggerOptions](interfaces/LoggerOptions.md) | Context to give for a logger, which doesn't include properties that are global. |
| [SafContext](interfaces/SafContext.md) | Static, serializable context about what's currently going on. These should always be available in backend systems. |
| [SafContextWithAuth](interfaces/SafContextWithAuth.md) | Convenience type for when the context needs to have auth. |
| [SafReporters](interfaces/SafReporters.md) | Clients for reporting various sorts of telemetry. They're expected to be instantiated with a SafContext, so that context is included. |

## Type Aliases

| Type Alias | Description |
| ------ | ------ |
| [ErrorCollector](type-aliases/ErrorCollector.md) | Collectors take errors reported to them and propagate them to telemetry services such as Sentry. |
| [ErrorLevels](type-aliases/ErrorLevels.md) | Taken from Sentry, excluding "log" which seems superfluous and vague |
| [ErrorReporter](type-aliases/ErrorReporter.md) | The function that application logic has access to for reporting errors. |
| [LoggerContext](type-aliases/LoggerContext.md) | Context to give for a logger, which doesn't include properties that are global. |
| [SubsystemName](type-aliases/SubsystemName.md) | List of allowed subsystem names to be used as context for logging and such. |

## Variables

| Variable | Description |
| ------ | ------ |
| [defaultErrorReporter](variables/defaultErrorReporter.md) | Default ErrorReporter; call addErrorCollector with this to use it. |
| [metricHistogramDefaultBuckets](variables/metricHistogramDefaultBuckets.md) | - |
| [safContextStorage](variables/safContextStorage.md) | Storage for SafContext. |
| [safReportersStorage](variables/safReportersStorage.md) | AsyncLocalStorage for SafReporters. |
| [testContext](variables/testContext.md) | Context provided during testing. |

## Functions

| Function | Description |
| ------ | ------ |
| [addErrorCollector](functions/addErrorCollector.md) | Adds a callback for when errors are reported by the application. |
| [addLokiTransport](functions/addLokiTransport.md) | Adds a transport to the logger that sends logs to Loki. TODO: use env variables. |
| [addTransport](functions/addTransport.md) | For production, when the application starts, it should add any transports using this function. Then all SAF-based applications will log to winston and they'll propagate to loggers such as Loki. |
| [collectSystemMetrics](functions/collectSystemMetrics.md) | Call when the application starts. Calls [prom-client](https://www.npmjs.com/package/prom-client)'s collectDefaultMetrics function under the hood. |
| [createLogger](functions/createLogger.md) | Creates a child logger with the specified request ID. Any servers or processors should use this to create a unique logger for each request or job or what have you. However, if not "instantiating" the request, you should use the request ID provided by the caller, such as in the proto envelope, so that requests which span processes can be correlated. |
| [createSilentLogger](functions/createSilentLogger.md) | Create a logger that doesn't print anything. |
| [generateRequestId](functions/generateRequestId.md) | Generates a request ID. Only necessary for "requests" which are not initiated by proxy servers, such as for cron or async jobs. |
| [getSafContext](functions/getSafContext.md) | Convenience function for getting SafContext store. Errors if not found, returns testContext if in test mode. |
| [getSafContextWithAuth](functions/getSafContextWithAuth.md) | Convenience function for getting SafContext store with auth. Errors if either the store is not found, or auth is not included. |
| [getSafReporters](functions/getSafReporters.md) | Convenience method for getting the SafReporters from the storage. Errors if not found. |
| [getServiceName](functions/getServiceName.md) | Getter for service name. |
| [makeSubsystemErrorReporter](functions/makeSubsystemErrorReporter.md) | During setup, subsystems should use this to create their own set of reporters. "Operation name" should be the name of the function. |
| [makeSubsystemReporters](functions/makeSubsystemReporters.md) | Creates a new SafReporters object for a given subsystem and operation. |
| [setServiceName](functions/setServiceName.md) | Sets the service name. Should be called as soon as the process starts. This is provided in SafContext and to instrumentation. |
