[**@saflib/imports**](../../../../index.md)

---

# Interface: SnapshotBundles

Frontend bundle snapshot — measured or blocked.

## Properties

### chunks?

> `optional` **chunks**: `object`[]

#### bytes

> **bytes**: `number`

#### chunkName

> **chunkName**: `string`

#### gzipBytes?

> `optional` **gzipBytes**: `number`

---

### command?

> `optional` **command**: `string`

---

### fallback?

> `optional` **fallback**: `string`

---

### note?

> `optional` **note**: `string`

---

### preSideEffects?

> `optional` **preSideEffects**: `object`

#### note?

> `optional` **note**: `string`

#### spas?

> `optional` **spas**: `Record`\<`string`, [`SpaBundleSnapshot`](SpaBundleSnapshot.md)>\>

---

### reason?

> `optional` **reason**: `string`

---

### spas?

> `optional` **spas**: `Record`\<`string`, [`SpaBundleSnapshot`](SpaBundleSnapshot.md)>\>

---

### status

> **status**: `"ok"` \| `"skipped"` \| `"blocked"`
