[**@saflib/node**](../index.md)

---

# Interface: ErrorReportOptions

Subset of properties given to Sentry or similar error reporting services.
https://docs.sentry.io/platforms/javascript/guides/node/apis/#captureException

Mainly missing fields that are or should be handled automatically (such as in defaultErrorReporter).

- user
- contexts
- fingerprint
- tags

## Properties

### extra?

> `optional` **extra**: `Record`\<`string`, `unknown`\>

---

### level?

> `optional` **level**: [`ErrorLevels`](../type-aliases/ErrorLevels.md)
