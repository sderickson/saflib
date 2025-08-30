[**@saflib/node**](../index.md)

---

# Variable: defaultErrorReporter

> `const` **defaultErrorReporter**: [`ErrorReporter`](../type-aliases/ErrorReporter.md)

Default ErrorReporter; call addErrorCollector with this to use it.

- Add tags based on SafContext
- Set default level to error
- Ensure the "error" is an Error
- Send to dedicated error collectors, and also log to the logger
