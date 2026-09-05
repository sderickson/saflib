[**@saflib/openapi**](../index.md)

---

# index

## Interfaces

| Interface                              | Description |
| -------------------------------------- | ----------- |
| [components](interfaces/components.md) | -           |

## Type Aliases

| Type Alias                                                                             | Description                                                                      |
| -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| [Address](type-aliases/Address.md)                                                     | -                                                                                |
| [AssertNoRootResponseBodiesOptions](type-aliases/AssertNoRootResponseBodiesOptions.md) | -                                                                                |
| [ExtractRequestBody](type-aliases/ExtractRequestBody.md)                               | Convenience type to lookup the request body by operationId.                      |
| [ExtractRequestPathParams](type-aliases/ExtractRequestPathParams.md)                   | Convenience type to lookup the path params by operationId.                       |
| [ExtractRequestQueryParams](type-aliases/ExtractRequestQueryParams.md)                 | Convenience type to lookup the query params by operationId.                      |
| [ExtractResponseBody](type-aliases/ExtractResponseBody.md)                             | Convenience type to lookup the response body by operationId.                     |
| [OpenApiDocument](type-aliases/OpenApiDocument.md)                                     | Bundled OpenAPI document accepted by express-openapi-validator (3.0.x or 3.1.x). |
| [OpenApiEnforcedTag](type-aliases/OpenApiEnforcedTag.md)                               | -                                                                                |
| [OpenApiEnforcedTagMeta](type-aliases/OpenApiEnforcedTagMeta.md)                       | -                                                                                |
| [OpenApiTagViolation](type-aliases/OpenApiTagViolation.md)                             | -                                                                                |
| [RootResponseAllowKey](type-aliases/RootResponseAllowKey.md)                           | `operationId:statusCode`, e.g. `getMatter:200`.                                  |
| [RootResponseBodyViolation](type-aliases/RootResponseBodyViolation.md)                 | -                                                                                |

## Variables

| Variable                                                                     | Description                                       |
| ---------------------------------------------------------------------------- | ------------------------------------------------- |
| [OPENAPI\_ENFORCED\_TAG\_CATALOG](variables/OPENAPI_ENFORCED_TAG_CATALOG.md) | -                                                 |
| [OPENAPI\_ENFORCED\_TAG\_SET](variables/OPENAPI_ENFORCED_TAG_SET.md)         | -                                                 |
| [OPENAPI\_ENFORCED\_TAGS](variables/OPENAPI_ENFORCED_TAGS.md)                | -                                                 |
| [OPENAPI\_TAG\_BACKGROUND](variables/OPENAPI_TAG_BACKGROUND.md)              | Marks an operation as invocable by the job queue. |
| [OPENAPI\_TAG\_CSRF\_EXEMPT](variables/OPENAPI_TAG_CSRF_EXEMPT.md)           | -                                                 |
| [OPENAPI\_TAG\_EMAIL\_VERIFIED](variables/OPENAPI_TAG_EMAIL_VERIFIED.md)     | -                                                 |
| [OPENAPI\_TAG\_MFA\_REQUIRED](variables/OPENAPI_TAG_MFA_REQUIRED.md)         | -                                                 |
| [OPENAPI\_TAG\_NO\_AUTH](variables/OPENAPI_TAG_NO_AUTH.md)                   | -                                                 |
| [OPENAPI\_TAG\_SITE\_ADMIN\_ONLY](variables/OPENAPI_TAG_SITE_ADMIN_ONLY.md)  | -                                                 |

## Functions

| Function                                                                        | Description                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [asOpenApiDocument](functions/asOpenApiDocument.md)                             | Cast an inline OpenAPI object (e.g. in tests) to [OpenApiDocument](type-aliases/OpenApiDocument.md).                                                                                                                         |
| [assertNoRootResponseBodies](functions/assertNoRootResponseBodies.md)           | Throw if any success JSON response puts a resource at the document root. Pass current offenders in `allow` and remove entries as routes are migrated.                                                                        |
| [assertOpenApiOperationTags](functions/assertOpenApiOperationTags.md)           | Throw if any operation uses a tag outside [OPENAPI\_ENFORCED\_TAGS](variables/OPENAPI_ENFORCED_TAGS.md). Call at startup when loading a product OpenAPI document (and from package tests).                                   |
| [assertOpenApiRouteFileTags](functions/assertOpenApiRouteFileTags.md)           | -                                                                                                                                                                                                                            |
| [castJson](functions/castJson.md)                                               | Takes an imported JSON object and casts it to [OpenApiDocument](type-aliases/OpenApiDocument.md) so that express-openapi-validator can validate the JSON against the OpenAPI spec without complaining about a type mismatch. |
| [findRootResponseBodyViolations](functions/findRootResponseBodyViolations.md)   | Find 2xx `application/json` response schemas that put a business object, array, or bare `$ref` at the document root instead of a flat keyed envelope (`{ recipe: Recipe }`, `{ recipes: Recipe[] }`).                        |
| [findUnknownOpenApiOperationTags](functions/findUnknownOpenApiOperationTags.md) | Collect unknown operation tags from a bundled (or single-operation) OpenAPI document.                                                                                                                                        |
| [findUnknownOpenApiRouteFileTags](functions/findUnknownOpenApiRouteFileTags.md) | Scan routes YAML under a spec package for unknown operation tags. Prefer this in package tests; use [assertOpenApiOperationTags](functions/assertOpenApiOperationTags.md) on the bundled document at process startup.        |
