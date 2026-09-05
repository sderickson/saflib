[**@saflib/security**](../../../../../index.md)

---

# Type Alias: CreateSecurityPlaywrightConfigOptions

> **CreateSecurityPlaywrightConfigOptions** = `object`

## Properties

### config?

> `optional` **config**: `PlaywrightTestConfig`

Extra Playwright config merged last.

---

### excludeCanary?

> `optional` **excludeCanary**: `boolean`

When true (default), skip `@canary` specs (production HTTPS checks).

---

### testDir?

> `optional` **testDir**: `string`

Directory containing `*.spec.ts` security tests. Defaults to `./`.
