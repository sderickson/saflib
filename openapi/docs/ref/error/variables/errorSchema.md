[**@saflib/openapi**](../../index.md)

---

# Variable: errorSchema

> `const` **errorSchema**: `string`

The raw error.yaml file contents from this package.
Specs should `$ref: "pkg:@saflib/openapi/schemas/error.yaml"` rather than
copying this file. TypeScript consumers import from `@saflib/openapi/schemas/Error`.
