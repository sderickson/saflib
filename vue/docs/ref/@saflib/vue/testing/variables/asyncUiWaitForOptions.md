[**@saflib/vue**](../../../../index.md)

---

# Variable: asyncUiWaitForOptions

> `const` **asyncUiWaitForOptions**: `object`

Pass to `vi.waitFor(..., options)` for tests that mount AsyncPage, MSW-backed
queries, and/or async route chunks. Vitest’s default waitFor timeout is 1000ms,
which often flakes under parallel CI or CPU/memory pressure.

## Type declaration

### interval

> `readonly` **interval**: `25` = `25`

### timeout

> `readonly` **timeout**: `10000` = `10_000`
