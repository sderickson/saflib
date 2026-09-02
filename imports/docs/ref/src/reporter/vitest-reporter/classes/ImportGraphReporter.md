[**@saflib/imports**](../../../../index.md)

---

# Class: ImportGraphReporter

Vitest reporter that prints static import-graph stats after each test file,
plus a run summary (collect timing stats and slowest files).

Opt-in via `IMPORT_GRAPH_REPORT=1` (wired from `@saflib/vitest` base config).
Root shortcut: `npm run import-graph:report -- <workspace>`.

## Implements

- `Reporter`

## Constructors

### Constructor

> **new ImportGraphReporter**(): `ImportGraphReporter`

#### Returns

`ImportGraphReporter`

## Methods

### onTestModuleEnd()

> **onTestModuleEnd**(`testModule`): `void`

Called when all tests of the test file have finished running.

#### Parameters

| Parameter    | Type         |
| ------------ | ------------ |
| `testModule` | `TestModule` |

#### Returns

`void`

#### Implementation of

`Reporter.onTestModuleEnd`

---

### onTestRunEnd()

> **onTestRunEnd**(): `void`

Called when the test run is finished.

#### Returns

`void`

#### Implementation of

`Reporter.onTestRunEnd`
