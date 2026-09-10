[**@saflib/monorepo**](../../index.md)

---

# Function: importGlobForTopLevelSegment()

> **importGlobForTopLevelSegment**(`segment`): `object`

Derive package-local `#` import maps from `exports`.

Extensions stay in the import specifier (`#foo.ts`), so targets are
extension-preserving (`./*` not `./*.ts`).

Convention:

- If `exports` has `./*`, use only `#*` (covers root + nested). Do not also
  list thematic folder globs — they are redundant.
- Otherwise list thematic `#dir/*` globs, root files (`#i18n.ts`), and
  barrels (`#clients` → `./clients/index.ts`) so the map documents what is
  importable from nested files.

## Parameters

| Parameter | Type     |
| --------- | -------- |
| `segment` | `string` |

## Returns

`object`

### key

> **key**: `string`

### value

> **value**: `string`
