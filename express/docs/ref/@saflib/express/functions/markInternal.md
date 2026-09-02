[**@saflib/express**](../../../index.md)

---

# Function: markInternal()

> **markInternal**(`app`): `RequestListener`

Wraps an HTTP request listener (e.g. an Express app) so each request is
tagged as internal via a non-enumerable, process-local Symbol property
before the underlying app handles it.

The tag can only be set in-process — it is not derived from headers.
Use with `http.createServer(markInternal(app))` or `supertest(markInternal(app))`.

## Parameters

| Parameter | Type              |
| --------- | ----------------- |
| `app`     | `RequestListener` |

## Returns

`RequestListener`
