[**@saflib/express**](../index.md)

---

# Interface: GlobalMiddlewareOptions

Options for creating global middleware.

## Properties

### disableCors?

> `optional` **disableCors**: `boolean`

---

### jsonLimit?

> `optional` **jsonLimit**: `string`

Max size for JSON request body (e.g. '100kb', '2mb').
Default is Express's 100kb when not set.
