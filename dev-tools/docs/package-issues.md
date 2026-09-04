# Package Analysis

SAF dev-tools provides the `saf-analyze-package` CLI tool to analyze packages for technical debt. How that's defined and what should be done about it is in development, but the point is to help make sure that contributions by developers and agents alike can be easily and quickly assessed and acted on, in order to keep the codebase well maintainable and accessible.

To run the tool:

```bash
npm exec -- saf-analyze-package --package <name>
```

This document helps guide resolving identified issues.

## Dead Code

1. **CLI**
   → Put under `scripts/` or `bin/` and wire `package.json`.

2. **Truly unused**
   → **Delete** (and drop tests that only existed for it).

3. **Shared test fixture**
   → Name it `*.fixture.ts` (Playwright page objects) or `*.fixtures.ts` (other).
   `*.test-helpers.ts` is also skipped.

4. **False positive**
   → Fix the tool. It's under development so this is still expected to happen regularly.

## Other issue kinds

| Kind                        | Typical fix                                                                                                                                                                                                                      |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `oversized-file` (>800 LoC) | Split into folders/modules; don't silence without splitting                                                                                                                                                                      |
| `package-layout`            | No `.ts` at package root except allowlisted entry/config files. Either align that they should be allowlisted (especially if it'd end up being a single file in a folder), or do the work to move them to the appropriate folder. |
| exports remaps              | Make import path = file path.                                                                                                                                                                                                    |

## Addressing issues with dev-site

The [dev-site](../../dev-site/docs/01-overview.md) provides a UI for viewing issues across the codebase, to help with triage and decision-making. Issues are not necessarily expected to be fixed immediately, but instead debt should be monitored and addressed intermittently, especially after or before new development.
