/**
 * Pass to `vi.waitFor(..., options)` for tests that mount AsyncPage, MSW-backed
 * queries, and/or async route chunks. Vitest’s default waitFor timeout is 1000ms,
 * which often flakes under parallel CI or CPU/memory pressure.
 */
export const asyncUiWaitForOptions = {
  timeout: 10_000,
  interval: 25,
} as const;
