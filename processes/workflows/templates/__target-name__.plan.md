# Implementation plan: [project-name]

[One short paragraph: how the spec is sequenced into independently testable
phases. After each phase the stack should typecheck / test green and be a
reasonable stopping point.]

> **Spec:** `[project-name].spec.md` (sibling)
> **Depends on:** [shipped features or sibling specs this builds on, if any]
> **Workflows:** `[project-name].workflow.ts` orchestrator (sibling; authored
> after this plan is approved)

## Strategy

[2-6 sentences or a single bolded arrow-chain summarizing the build order and
the one or two invariants that shape it, e.g. "OpenAPI contract → DB → HTTP →
SDK → UI. Preview and cron must share the same eligibility module."]

## Conventions

[Only the rules that will actually steer implementation, e.g.:]

- **API design**: `/saflib/openapi/docs/02-api-design.md` — one URL per action;
  responses keyed by resource name.
- **One thing per file**: each new schema, route, table, query, handler, and
  SDK hook gets its own workflow invocation; targeted edits to existing files
  are **Manual** steps.
- [Project-specific conventions: constants modules, shared helpers, cwd for
  particular workflows, fresh-vs-migrate decisions, etc.]

## Phases at a glance

| Phase | Goal |
| --- | --- |
| 1 | [goal] |
| 2 | [goal] |
| ... | ... |

---

## Phase 1 — [name]

**Goal:** [one sentence]

Work in `[package directory]`.

1. **`[workflow/id]`** — [args, e.g. `path=...`, `urlPath=...`, `method=...`] —
   [one-line prompt gist for the implementer]
2. **Manual** — [targeted edit to an existing file, with the file path]
3. [Tests for this phase]

**Checkpoint:** [observable state proving the phase landed: tests that pass,
something pokeable]

---

## Phase 2 — [name]

[same shape]

---

## Testing notes (cross-cutting)

[Where the real coverage lives; anything to verify manually at the end.]

## Out of scope

[Things adjacent to this plan that are deliberately not scheduled, so the
implementer doesn't scope-creep into them.]
