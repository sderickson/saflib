[**@saflib/imports**](../../../index.md)

---

# src/baseline/baseline

## Interfaces

| Interface                                                        | Description                                                  |
| ---------------------------------------------------------------- | ------------------------------------------------------------ |
| [BaselineBundles](interfaces/BaselineBundles.md)                 | Frontend bundle baseline — measured or blocked.              |
| [BaselineGraphStats](interfaces/BaselineGraphStats.md)           | Per-entry graph measurement stored in the baseline snapshot. |
| [BaselineRegression](interfaces/BaselineRegression.md)           | -                                                            |
| [BaselineSnapshot](interfaces/BaselineSnapshot.md)               | Committed baseline snapshot shape.                           |
| [BaselineSuiteTiming](interfaces/BaselineSuiteTiming.md)         | Suite wall / collect timings.                                |
| [BaselineTypecheck](interfaces/BaselineTypecheck.md)             | Serial workspace typecheck timing.                           |
| [DiffBaselineOptions](interfaces/DiffBaselineOptions.md)         | -                                                            |
| [DiffBaselineResult](interfaces/DiffBaselineResult.md)           | -                                                            |
| [GenerateBaselineOptions](interfaces/GenerateBaselineOptions.md) | -                                                            |

## Functions

| Function                                          | Description                                                                                                                         |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| [diffBaseline](functions/diffBaseline.md)         | Re-measure graphs and compare to a committed baseline. Reports regressions; caller exits 0 in M0 (report-only).                     |
| [formatRegression](functions/formatRegression.md) | Format a regression line for CLI output.                                                                                            |
| [generateBaseline](functions/generateBaseline.md) | Generate a baseline snapshot: all `*.test.ts` graphs, entry probes, optional suite/typecheck timings, and best-effort bundle sizes. |
