[**@saflib/express**](../../../index.md)

---

# Interface: StartServerOptions

Options when starting an Express server.
At least one of `port` / `socketPath` is required.

## Properties

### port?

> `optional` **port**: `number`

Public TCP listener port.

---

### socketPath?

> `optional` **socketPath**: `string`

Internal unix-socket listener path. Requests are tagged via markInternal.
