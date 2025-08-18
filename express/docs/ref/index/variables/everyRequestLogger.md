[**@saflib/express**](../../index.md)

***

# Variable: everyRequestLogger

> `const` **everyRequestLogger**: `Handler`

HTTP request logging middleware using Morgan.
Mainly used for debugging in development, not propagated to something like Loki in production.
Format: ":date[iso] <:id> :method :url :status :response-time ms - :res[content-length]"
