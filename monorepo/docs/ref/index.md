**@saflib/monorepo**

***

# @saflib/monorepo

## Type Aliases

| Type Alias | Description |
| ------ | ------ |
| [ReturnsError](type-aliases/ReturnsError.md) | An object with either a `result` or an `error`. Async functions which are exported by packages, such as database queries and integration calls, should use this for their return types. This way errors are typed and can be handled with type safety. |

## Functions

| Function | Description |
| ------ | ------ |
| [throwError](functions/throwError.md) | If a Promise which uses ReturnsError is unlikely to error, use this function to throw a chained error and return the result. **Use this function responsibly.** By using it you declare "I bet this won't happen". |
