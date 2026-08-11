/**
 * Minimal `localStorage` for Vitest (Node jsdom / Node 22+ experimental webstorage).
 * Avoids `ExperimentalWarning: localStorage is not available...` when suites
 * touch browser storage APIs.
 */
export function installLocalStorageStub(): void {
  const store = new Map<string, string>();
  const stub: Storage = {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, String(value));
    },
    removeItem: (key) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
    key: (index) => [...store.keys()][index] ?? null,
    get length() {
      return store.size;
    },
  };

  Object.defineProperty(globalThis, "localStorage", {
    value: stub,
    configurable: true,
  });
}
