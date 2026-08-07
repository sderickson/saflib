[**@saflib/express**](../index.md)

---

# Interface: StartedExpressServer

## Properties

### close()

> **close**: () => `Promise`\<`void`>\>

Close all started servers.

#### Returns

`Promise`\<`void`\>

---

### internalServer?

> `optional` **internalServer**: `Server`\<_typeof_ `IncomingMessage`, _typeof_ `ServerResponse`>\>

Internal unix-socket server, present when `socketPath` was provided.

---

### server?

> `optional` **server**: `Server`\<_typeof_ `IncomingMessage`, _typeof_ `ServerResponse`>\>

Public TCP server, present when `port` was provided.
