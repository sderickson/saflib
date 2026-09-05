[**@saflib/imports**](../../../index.md)

---

# src/snapshot/snapshot

## Interfaces

| Interface                                                        | Description                                               |
| ---------------------------------------------------------------- | --------------------------------------------------------- |
| [CheckSnapshotOptions](interfaces/CheckSnapshotOptions.md)       | -                                                         |
| [CheckSnapshotResult](interfaces/CheckSnapshotResult.md)         | -                                                         |
| [GenerateSnapshotOptions](interfaces/GenerateSnapshotOptions.md) | -                                                         |
| [MetricsSnapshot](interfaces/MetricsSnapshot.md)                 | Committed metrics snapshot shape.                         |
| [SnapshotBundles](interfaces/SnapshotBundles.md)                 | Frontend bundle snapshot — measured or blocked.           |
| [SnapshotGraphStats](interfaces/SnapshotGraphStats.md)           | Per-entry graph measurement stored in a metrics snapshot. |
| [SnapshotRegression](interfaces/SnapshotRegression.md)           | -                                                         |
| [SnapshotSuiteTiming](interfaces/SnapshotSuiteTiming.md)         | Suite wall / collect timings.                             |
| [SnapshotTypecheck](interfaces/SnapshotTypecheck.md)             | Serial workspace typecheck timing.                        |
| [SpaBundleSnapshot](interfaces/SpaBundleSnapshot.md)             | SPA shell + route page-chunk snapshot.                    |
| [SpaRouteSnapshot](interfaces/SpaRouteSnapshot.md)               | Per-route SPA bundle snapshot.                            |

## Functions

| Function                                                              | Description                                                                                                                        |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| [checkSnapshot](functions/checkSnapshot.md)                           | Re-measure graphs and compare to a committed snapshot. Reports regressions; caller exits 0 in M0 (report-only).                    |
| [formatRegression](functions/formatRegression.md)                     | Format a regression line for CLI output.                                                                                           |
| [generateSnapshot](functions/generateSnapshot.md)                     | Generate a metrics snapshot: all `*.test.ts` graphs, entry probes, optional suite/typecheck timings, and best-effort bundle sizes. |
| [isFatalSnapshotRegression](functions/isFatalSnapshotRegression.md)   | Regressions that fail when `snapshot check --mode error`.                                                                          |
| [isRoutePageChunkRegression](functions/isRoutePageChunkRegression.md) | Route page-chunk timing regressions are warn-only even in error mode (M9).                                                         |
