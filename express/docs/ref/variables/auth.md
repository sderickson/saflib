[**@saflib/express**](../index.md)

***

# Variable: auth

> `const` **auth**: `Handler`

Middleware that adds user information from headers to the request object.
Expects x-user-id, x-user-email, and x-user-scopes headers to be set by authentication layer.
Throws 401 if required headers are missing.
