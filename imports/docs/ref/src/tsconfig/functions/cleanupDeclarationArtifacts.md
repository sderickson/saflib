[**@saflib/imports**](../../../index.md)

---

# Function: cleanupDeclarationArtifacts()

> **cleanupDeclarationArtifacts**(`options`): [`CleanupDeclarationArtifactsResult`](../interfaces/CleanupDeclarationArtifactsResult.md)

Remove co-located TypeScript declaration emit artifacts.

Packages should emit to `dist/types`; maps and `.d.ts` next to `.ts` sources
are stale noise (often left when `rootDir` was missing).

## Parameters

| Parameter | Type                                                                                        |
| --------- | ------------------------------------------------------------------------------------------- |
| `options` | [`CleanupDeclarationArtifactsOptions`](../interfaces/CleanupDeclarationArtifactsOptions.md) |

## Returns

[`CleanupDeclarationArtifactsResult`](../interfaces/CleanupDeclarationArtifactsResult.md)
