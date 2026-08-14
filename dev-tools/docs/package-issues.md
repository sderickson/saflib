# Package issues triage

How to clear findings from:

- `saf-dev-site issues [--workdir] --package <name>`
- `analyze-package --package <name>`
- Spec Issues UI

Do **not** blindly delete exports. Triage each item.

## Decision tree (dead-code / same-file-only)

1. **Same-file helper** — exported but only used in its defining file  
   → **Un-export** (`export` → local), or split if tests need a public leaf.  
   Same-file **value** references count as `usedBy` (self-edge) and surface as
   `same-file-only-export`, not `dead-code`. Pure unused exports (never called
   in-file or out) remain `dead-code`.

2. **Tested helper only used in that file (+ tests)** — unit tests import the export  
   → **Split into its own module**; production parent imports the leaf.  
   Rule of thumb: *if it has a focused unit test, it deserves its own file.*  
   That also creates a real non-test importer so the issue clears.

3. **CLI / validate / generate entrypoint** — only called from `*.test.ts` or nowhere  
   → Put under `scripts/` and wire `package.json` via `saf-ts-run ./scripts/…`, **or** under `bin/` with a `package.json` `bin` entry.  
   Integration tests alone do **not** count as production use.

4. **Truly unused** — no production and no meaningful test surface  
   → **Delete** (and drop tests that only existed for it).

5. **Shared test fixture** — name it `*.fixtures.ts` (not scanned for dead-code / LoC).  
   Do **not** invent a fake prod caller.

6. **False positive** — real prod importers exist but Issues still flags  
   → **Fix the tool**, usually:
   - `package.json` **exports remaps** (`"./foo": "./bar/lib.ts"`) so graph keys don't match import targets — prefer disk-path imports (`…/bar/lib`) and drop remaps
   - dynamic `import()`, or code under excluded dirs
   - domain leaves (drizzle queries, routes) needing `@saflib/imports` domain extensions

## Other issue kinds

| Kind | Typical fix |
| --- | --- |
| `oversized-file` (>800 LoC) | Split into folders/modules; don't silence without splitting |
| `package-layout` | No `.ts` at package root; `bin` → `./bin/…`; `saf-ts-run` → `./scripts/` or `./bin/`; ban `node --experimental-strip-types` in scripts |
| exports remaps | Make import path = file path; `saf-imports exports check` / `analyze-package` |

## Verify

```bash
npm exec -- saf-dev-site issues --workdir --package <name>
# or
npm exec -- analyze-package --package <name>
```

Prefer small, coherent batches (one pattern at a time) over boiling the ocean.

## History debt graph (dev-site)

The History page tracks **per-commit issue counts** stored at scan time
(`package_issue_stats`). Use it as a **seasonal debt gauge**, not a permanent
zero SLA.

- **Debt** = `dead-code` + `oversized-file` + `package-layout`
- **`same-file-only-export`** is tracked but **not** debt (co-location signal)
- New packages start near zero; growth/restructure seasons spike specific kinds
- Prefer fixing issues in packages you touch; use History hotspots to decide when
  a dedicated cleanup PR is worth it
- After analyzer changes, backfill with:

```bash
npm exec -- saf-dev-site scan --recompute-issues --limit 20
# replace existing rows:
npm exec -- saf-dev-site scan --recompute-issues --force --limit 20
```
