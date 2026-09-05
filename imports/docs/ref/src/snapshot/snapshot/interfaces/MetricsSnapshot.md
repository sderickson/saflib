[**@saflib/imports**](../../../../index.md)

---

# Interface: MetricsSnapshot

Committed metrics snapshot shape.

## Properties

### bundles

> **bundles**: [`SnapshotBundles`](SnapshotBundles.md)

---

### entries

> **entries**: `Record`\<`string`, [`SnapshotGraphStats`](SnapshotGraphStats.md)>\>

---

### generatedAt

> **generatedAt**: `string`

---

### repo

> **repo**: `string`

---

### suites

> **suites**: `Record`\<`string`, [`SnapshotSuiteTiming`](SnapshotSuiteTiming.md)>\>

---

### testFileCount

> **testFileCount**: `number`

---

### tests

> **tests**: `Record`\<`string`, [`SnapshotGraphStats`](SnapshotGraphStats.md)>\>

---

### typecheck

> **typecheck**: [`SnapshotTypecheck`](SnapshotTypecheck.md)
