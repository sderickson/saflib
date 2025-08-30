[**@saflib/workflows**](../index.md)

---

# Interface: ComposerFunctionOptions

Options for all composer functions. These functions return
an object which can be spread into an XState "states" object,
for easily composing a workflow machine from common steps.

## Extended by

- [`RunTestsComposerOptions`](RunTestsComposerOptions.md)
- [`RunNpmCommandFactoryOptions`](RunNpmCommandFactoryOptions.md)
- [`UpdateTemplateFileComposerOptions`](UpdateTemplateFileComposerOptions.md)

## Properties

### nextStateName

> **nextStateName**: `string`

---

### stateName

> **stateName**: `string`
