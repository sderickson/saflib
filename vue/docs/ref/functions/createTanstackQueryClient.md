[**@saflib/vue**](../index.md)

***

# Function: createTanstackQueryClient()

> **createTanstackQueryClient**(): `QueryClient`

Creates a Tanstack Query client with default timeout and retry settings. It has a staleTime of 10 seconds, so that requests made from different parts of the page during a page load don't trigger multiple requests. It also doesn't retry for status codes that are unlikely to be fixed by retrying, such as 401, 403, 404, 500, and network errors.

## Returns

`QueryClient`
