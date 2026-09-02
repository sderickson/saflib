[**@saflib/node**](../index.md)

---

# index

## Classes

| Class                                                             | Description |
| ----------------------------------------------------------------- | ----------- |
| [AssertionError](classes/AssertionError.md)                       | -           |
| [AssertionExpiredError](classes/AssertionExpiredError.md)         | -           |
| [AssertionKeysConfigError](classes/AssertionKeysConfigError.md)   | -           |
| [AssertionMalformedError](classes/AssertionMalformedError.md)     | -           |
| [AssertionSignatureError](classes/AssertionSignatureError.md)     | -           |
| [AssertionTtlExceededError](classes/AssertionTtlExceededError.md) | -           |
| [AssertionUnknownKeyError](classes/AssertionUnknownKeyError.md)   | -           |

## Interfaces

| Interface                                                | Description                                                                                                                                              |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Auth](interfaces/Auth.md)                               | Auth object passed in with every authenticated request.                                                                                                  |
| [ErrorCollectorParam](interfaces/ErrorCollectorParam.md) | Parameters provided to error collectors.                                                                                                                 |
| [ErrorReportOptions](interfaces/ErrorReportOptions.md)   | Subset of properties given to Sentry or similar error reporting services. https://docs.sentry.io/platforms/javascript/guides/node/apis/#captureException |
| [IdentityAssertion](interfaces/IdentityAssertion.md)     | -                                                                                                                                                        |
| [LoggerOptions](interfaces/LoggerOptions.md)             | Context to give for a logger, which doesn't include properties that are global.                                                                          |
| [SafContext](interfaces/SafContext.md)                   | Static, serializable context about what's currently going on. These should always be available in backend systems.                                       |
| [SafContextWithAuth](interfaces/SafContextWithAuth.md)   | Convenience type for when the context needs to have auth.                                                                                                |
| [SafReporters](interfaces/SafReporters.md)               | Clients for reporting various sorts of telemetry. They're expected to be instantiated with a SafContext, so that context is included.                    |

## Type Aliases

| Type Alias                                       | Description                                                                                      |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| [ErrorCollector](type-aliases/ErrorCollector.md) | Collectors take errors reported to them and propagate them to telemetry services such as Sentry. |
| [ErrorLevels](type-aliases/ErrorLevels.md)       | Taken from Sentry, excluding "log" which seems superfluous and vague                             |
| [ErrorReporter](type-aliases/ErrorReporter.md)   | The function that application logic has access to for reporting errors.                          |
| [LoggerContext](type-aliases/LoggerContext.md)   | Context to give for a logger, which doesn't include properties that are global.                  |
| [SubsystemName](type-aliases/SubsystemName.md)   | List of allowed subsystem names to be used as context for logging and such.                      |

## Variables

| Variable                                                                          | Description                                                                                                                                |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| [defaultErrorReporter](variables/defaultErrorReporter.md)                         | Default ErrorReporter; call addErrorCollector with this to use it.                                                                         |
| [HTTP_ACCESS_DURATION_WIDTH](variables/HTTP_ACCESS_DURATION_WIDTH.md)             | Fixed 6-char duration (` 325ms` / ` 72.2s`).                                                                                               |
| [HTTP_ACCESS_LARGE_BYTES](variables/HTTP_ACCESS_LARGE_BYTES.md)                   | Response body at or above this size (bytes) is highlighted when ANSI styling is on.                                                        |
| [HTTP_ACCESS_SIZE_WIDTH](variables/HTTP_ACCESS_SIZE_WIDTH.md)                     | Fixed 6-char response size; kb when > 1024 bytes.                                                                                          |
| [HTTP_ACCESS_SLOW_MS](variables/HTTP_ACCESS_SLOW_MS.md)                           | Access-log duration above this (ms) is highlighted when ANSI styling is on.                                                                |
| [HTTP_CHANNEL_CLIENT_PLAIN](variables/HTTP_CHANNEL_CLIENT_PLAIN.md)               | Browser/client traffic — heavy bar, arrow leans left (inbound from the edge). Unicode: BLACK LEFT-POINTING POINTER + HEAVY HORIZONTAL.     |
| [HTTP_CHANNEL_INTERNAL_PLAIN](variables/HTTP_CHANNEL_INTERNAL_PLAIN.md)           | Internal background traffic — light bar, arrow leans right (outbound dispatch). Unicode: LIGHT HORIZONTAL + RIGHT-POINTING SMALL TRIANGLE. |
| [HTTP_CHANNEL_MARKER_WIDTH](variables/HTTP_CHANNEL_MARKER_WIDTH.md)               | Fixed visual width for the HTTP channel marker column.                                                                                     |
| [metricHistogramDefaultBuckets](variables/metricHistogramDefaultBuckets.md)       | -                                                                                                                                          |
| [SAF_INTERNAL_ASSERTION_KEYS_NAME](variables/SAF_INTERNAL_ASSERTION_KEYS_NAME.md) | -                                                                                                                                          |
| [safContextStorage](variables/safContextStorage.md)                               | Storage for SafContext.                                                                                                                    |
| [safReportersStorage](variables/safReportersStorage.md)                           | AsyncLocalStorage for SafReporters.                                                                                                        |
| [testContext](variables/testContext.md)                                           | Context provided during testing.                                                                                                           |

## Functions

| Function                                                                      | Description                                                                                                                                                                                                                                                                                                                                                    |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [addErrorCollector](functions/addErrorCollector.md)                           | Adds a callback for when errors are reported by the application.                                                                                                                                                                                                                                                                                               |
| [addTransport](functions/addTransport.md)                                     | For production, when the application starts, it should add any transports using this function. Then all SAF-based applications will log to winston and they'll propagate to loggers such as Loki.                                                                                                                                                              |
| [collectSystemMetrics](functions/collectSystemMetrics.md)                     | Call when the application starts. Calls [prom-client](https://www.npmjs.com/package/prom-client)'s collectDefaultMetrics function under the hood.                                                                                                                                                                                                              |
| [configureInternalAssertionKeys](functions/configureInternalAssertionKeys.md) | Loads HMAC assertion keys from the secret store when not set in env (prod). Dev sets `SAF_INTERNAL_ASSERTION_KEYS` in env; job tests stub env directly. Prod-local with `INFISICAL_TOKEN=mock` gets the placeholder `"mock"`, which `signAssertion` / `verifyAssertion` accept as a fixed local key.                                                           |
| [createLogger](functions/createLogger.md)                                     | Creates a child logger with the specified request ID. Any servers or processors should use this to create a unique logger for each request or job or what have you. However, if not "instantiating" the request, you should use the request ID provided by the caller, such as in the proto envelope, so that requests which span processes can be correlated. |
| [createSilentLogger](functions/createSilentLogger.md)                         | Create a logger that doesn't print anything.                                                                                                                                                                                                                                                                                                                   |
| [formatCompactTimestamp](functions/formatCompactTimestamp.md)                 | Shared compact log timestamp: `MM-DD HH:mm` (UTC when TZ=UTC).                                                                                                                                                                                                                                                                                                 |
| [formatHttpAccessLine](functions/formatHttpAccessLine.md)                     | -                                                                                                                                                                                                                                                                                                                                                              |
| [formatHttpDurationMs](functions/formatHttpDurationMs.md)                     | Fixed 6-char duration for access-log columns. Under 10s: ` 325ms`. At/above 10s: ` 72.2s` / ` 999s` so long requests are never left-truncated (e.g. `72233ms` must not become `2233ms`).                                                                                                                                                                       |
| [formatHttpMethod](functions/formatHttpMethod.md)                             | Fixed 5-char HTTP method so paths align (`GET ` vs `PATCH`).                                                                                                                                                                                                                                                                                                   |
| [formatHttpResponseSize](functions/formatHttpResponseSize.md)                 | Fixed 6-char response size; kb when > 1024 bytes.                                                                                                                                                                                                                                                                                                              |
| [formatHttpStatus](functions/formatHttpStatus.md)                             | Fixed 3-char HTTP status for access-log alignment.                                                                                                                                                                                                                                                                                                             |
| [generateRequestId](functions/generateRequestId.md)                           | Generates a request ID. Only necessary for "requests" which are not initiated by proxy servers, such as for cron or async jobs.                                                                                                                                                                                                                                |
| [getErrorCollectors](functions/getErrorCollectors.md)                         | -                                                                                                                                                                                                                                                                                                                                                              |
| [getSafContext](functions/getSafContext.md)                                   | Convenience function for getting SafContext store. Errors if not found, returns testContext if in test mode.                                                                                                                                                                                                                                                   |
| [getSafContextWithAuth](functions/getSafContextWithAuth.md)                   | Convenience function for getting SafContext store with auth. Errors if either the store is not found, or auth is not included.                                                                                                                                                                                                                                 |
| [getSafReporters](functions/getSafReporters.md)                               | Convenience method for getting the SafReporters from the storage. Errors if not found.                                                                                                                                                                                                                                                                         |
| [getServiceName](functions/getServiceName.md)                                 | Getter for service name.                                                                                                                                                                                                                                                                                                                                       |
| [httpAccessAnsiEnabled](functions/httpAccessAnsiEnabled.md)                   | -                                                                                                                                                                                                                                                                                                                                                              |
| [httpChannelIndicator](functions/httpChannelIndicator.md)                     | -                                                                                                                                                                                                                                                                                                                                                              |
| [makeSubsystemErrorReporter](functions/makeSubsystemErrorReporter.md)         | During setup, subsystems should use this to create their own set of reporters. "Operation name" should be the name of the function.                                                                                                                                                                                                                            |
| [makeSubsystemReporters](functions/makeSubsystemReporters.md)                 | Creates a new SafReporters object for a given subsystem and operation.                                                                                                                                                                                                                                                                                         |
| [runWithActingUser](functions/runWithActingUser.md)                           | Run `fn` with `auth.userId` set on the current [SafContext](interfaces/SafContext.md). Use when a request is anonymous (webhooks, jobs) but should be attributed to the user who created the related resource for logging, analytics, and error reporting.                                                                                                     |
| [setServiceName](functions/setServiceName.md)                                 | Sets the service name. Should be called as soon as the process starts. This is provided in SafContext and to instrumentation.                                                                                                                                                                                                                                  |
| [signAssertion](functions/signAssertion.md)                                   | Signs an identity assertion.                                                                                                                                                                                                                                                                                                                                   |
| [verifyAssertion](functions/verifyAssertion.md)                               | Verifies an identity assertion token against any configured key.                                                                                                                                                                                                                                                                                               |

## References

### getGitHashes

Re-exports [getGitHashes](../src/git-hashes/functions/getGitHashes.md)

---

### GitHashes

Re-exports [GitHashes](../src/git-hashes/interfaces/GitHashes.md)

---

### NodeEnvSchema

Re-exports [NodeEnvSchema](../env/interfaces/NodeEnvSchema.md)

---

### typedEnv

Re-exports [typedEnv](../env/variables/typedEnv.md)
