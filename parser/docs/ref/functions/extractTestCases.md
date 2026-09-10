[**@saflib/parser**](../index.md)

---

# Function: extractTestCases()

> **extractTestCases**(`source`): [`TestCaseEntry`](../interfaces/TestCaseEntry.md)[]

Extract `describe` / `it` / `test` cases from source using the syntactic parser
only. Nested `describe` titles are joined onto the leaf title with `" > "`.

`it.skip` / `it.only` / `test.skip` / `test.only` / `describe.skip` /
`describe.only` **count** — they are still declared tests; skip/only is a
runtime concern, not an inventory concern.

`it.each` / `test.each` / `describe.each` **count** using the title template
string (e.g. `"matches committed schema for %s"`). Rows are not expanded —
only the template is stable without evaluating the table.
Non-string titles are skipped.

## Parameters

| Parameter | Type     |
| --------- | -------- |
| `source`  | `string` |

## Returns

[`TestCaseEntry`](../interfaces/TestCaseEntry.md)[]
