[**@saflib/imports**](../../../../index.md)

---

# Interface: SnapshotTypecheck

Serial workspace typecheck timing.

## Properties

### peakRssMb?

> `optional` **peakRssMb**: `number`

---

### reason?

> `optional` **reason**: `string`

---

### rootBuildWallMs?

> `optional` **rootBuildWallMs**: `number`

Warm 2nd-run wall time for root `npm run typecheck` (`vue-tsc -b`).

---

### serialWorkspacesWallMs

> **serialWorkspacesWallMs**: `number`

---

### status?

> `optional` **status**: `"ok"` \| `"failed"` \| `"skipped"`

---

### warmSinglePackage?

> `optional` **warmSinglePackage**: `string`

---

### warmSinglePackageWallMs?

> `optional` **warmSinglePackageWallMs**: `number`

Warm 2nd-run wall time for a single-package pilot (repo `safImports.snapshot.warmTypecheckPackageDir`).
