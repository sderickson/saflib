[**@saflib/workflows**](../index.md)

---

# Interface: TestStepInput

Input for the TestStepMachine.

## Properties

### fileId?

> `optional` **fileId**: `string`

The id of the file to test. Must match one of the keys in the `templateFiles` property for the workflow. If not included, the workflow will run all tests for the current package.
