[**@saflib/openapi**](../../index.md)

---

# Variable: errorSchema

> `const` **errorSchema**: `string`

The raw error.yaml file contents from this package. There's not a great way to share OpenAPI schemas between packages, so this is exported for use elsewhere. Mainly this is used by `npm exec saf-specs generate` which writes the contents to `schemas/error.yaml` of whatever package it's run in.
