[**@saflib/openapi**](../index.md)

---

# error

## Variables

| Variable                                | Description                                                                                                                                                                                                                                                                                           |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [errorSchema](variables/errorSchema.md) | The raw error.yaml file contents from this package. There's not a great way to share OpenAPI schemas between packages, so this is exported for use elsewhere. Mainly this is used by `npm exec saf-specs generate` which writes the contents to `schemas/error.yaml` of whatever package it's run in. |
