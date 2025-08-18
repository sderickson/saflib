[**@saflib/express**](../../index.md)

***

# Variable: unsafeRequestLogger

> `const` **unsafeRequestLogger**: `Handler`

For tracking requests which are "unsafe", that is they make some sort of change.
These are logged to Loki or whatever transport Winston is hooked up to.
They use OpenAPI operationIds to help label the request; these should always be set.
