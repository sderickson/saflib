[**@saflib/parser**](../index.md)

---

# Interface: TestCaseEntry

One test case found by [extractTestCases](../functions/extractTestCases.md).

`fullName` joins enclosing `describe` titles and the leaf `it`/`test` title with
`" > "` (e.g. `"outer > inner > does the thing"`). That separator is part of the
public contract — blob_facts stores it as-is for assembly across commits.

## Properties

### fullName

> **fullName**: `string`
