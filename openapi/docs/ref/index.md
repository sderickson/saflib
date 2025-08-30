**@saflib/openapi**

---

# @saflib/openapi

## Type Aliases

| Type Alias                                                             | Description                                                  |
| ---------------------------------------------------------------------- | ------------------------------------------------------------ |
| [ExtractRequestBody](type-aliases/ExtractRequestBody.md)               | Convenience type to lookup the request body by operationId.  |
| [ExtractRequestPathParams](type-aliases/ExtractRequestPathParams.md)   | Convenience type to lookup the path params by operationId.   |
| [ExtractRequestQueryParams](type-aliases/ExtractRequestQueryParams.md) | Convenience type to lookup the query params by operationId.  |
| [ExtractResponseBody](type-aliases/ExtractResponseBody.md)             | Convenience type to lookup the response body by operationId. |

## Variables

| Variable                                | Description                                                                                                                                                                                                                                                                                           |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [errorSchema](variables/errorSchema.md) | The raw error.yaml file contents from this package. There's not a great way to share OpenAPI schemas between packages, so this is exported for use elsewhere. Mainly this is used by `npm exec saf-specs generate` which writes the contents to `schemas/error.yaml` of whatever package it's run in. |

## Functions

| Function                          | Description                                                                                                                                                                                             |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [castJson](functions/castJson.md) | Takes an imported JSON object and casts it to the OpenAPIV3.DocumentV3 type so that express-openapi-validator can validate the JSON against the OpenAPI spec without complaining about a type mismatch. |
