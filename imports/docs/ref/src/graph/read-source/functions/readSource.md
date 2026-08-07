[**@saflib/imports**](../../../../index.md)

---

# Function: readSource()

> **readSource**(`filePath`): `string`

Read a source file for import extraction.
For `.vue` SFCs, concatenate `<script>` / `<script setup>` / `<script lang="ts">`
bodies via regex — no `@vue/compiler-sfc`.

## Parameters

| Parameter  | Type     |
| ---------- | -------- |
| `filePath` | `string` |

## Returns

`string`
