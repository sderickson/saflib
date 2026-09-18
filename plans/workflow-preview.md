# Workflow preview: diff a plan's would-be changes as a synthetic commit

## Context

The todo-app plans just proved the engine end-to-end. The next feature is
"workflow previews": before (or during) a run, show what files it would
change, rendered as a diff against the current commit — reusing dev-site's
existing compare UI, since that already renders a `CommitDiff` for any two
commit hashes without ever checking anything out (it reads blobs purely via
`git ls-tree`/`git cat-file`).

Research this session established the shape of the problem:

- **Only `copy` and `transform-file` steps are mechanically previewable.**
  They're the only step kinds that produce file content from a pure/local
  computation; `prompt`/`command`/`npm-script`/`update` genuinely need a real
  agent or shell process and can't be faked. Confirmed by reading
  `new-workflows/lib/steps/copy/copy-step.ts` and `transform-file.ts`.
- **Those two kinds never appear in a YAML/config plan directly** — config
  workflows only get `prompt`/`command`/`cd`/`npm-script`/`call-workflow`
  (`copy`/`update`/`transform-file` are deliberately code-only, per
  `workflow-config-body.yaml`'s own doc comment). They only show up *inside*
  the code-defined child workflows that a plan's `call-workflow` steps
  invoke. So a useful preview **must recurse into `call-workflow`** steps —
  without that, previewing a real todo-app-style plan would abort on step 0.
  `call-workflow.ts`'s step input is already `{ targetDefinition, targetInput
  }` — the resolved `WorkflowDefinition` is handed to the step directly, so
  recursing just means walking `targetDefinition.steps` the same way the
  engine already recurses via `advanceRun`, just without a real child run
  row.
- **Non-previewable steps are skipped, not fatal**, at whatever step/list
  they occur in (top-level or nested) — the walk continues past a `prompt`/
  `command`/`npm-script`/`update` step to the next step in the same list,
  rather than aborting the whole preview. Real plans interleave validation
  commands between `call-workflow` steps; aborting globally on the first one
  would make previews nearly useless. Every skip is reported in the result
  so the UI can say plainly what wasn't covered.
- **Compare-as-a-commit is best done literally**: build a real (but
  unreferenced/dangling) git commit object via plumbing — `hash-object -w`,
  a scratch `GIT_INDEX_FILE` seeded via `read-tree`, `update-index
  --cacheinfo` per changed path, `write-tree`, `commit-tree`. No working
  tree or real index is ever touched. None of this plumbing exists yet in
  `@saflib/git` (confirmed: `git/index.ts` only exports `log`/`listTree`/
  `readBlob(s)`/refs/ancestry helpers) — it needs to be added there.
- **Per the scalability discussion, only the relevant subtree is ever
  materialized to disk, one step at a time**: for `transform-file`, exactly
  `input.filePath`; for `copy`, the `targetDir` subtree (bounded to one
  package/directory, not the whole repo — reusing `copy-step.ts`'s own
  existing-file-merge logic unmodified rather than reimplementing its naming
  rules to predict exact output filenames). The step functions themselves
  run completely unmodified against a scratch temp directory; only the
  handful of touched files are ever pulled into memory/disk, and each is
  released right after its step's blob is hashed back into git. The running
  scratch git index (path/mode/hash entries only, never content) is the only
  state carried across steps.
- **Previews are not persisted** to `analyzed_commits`/`package_metrics` —
  confirmed those tables are flat DB scans (`dev-site-db/queries/
  analyzed-commits/list.ts`'s `list()`), so a persisted throwaway commit
  would pollute the Timeline page. Instead, `diffCommits`'s DB-fetch step is
  split from its pure diff-computation step, so a preview can compute both
  sides' `AnalyzedSnapshot`s fresh via `analyzeCommit` (which already works
  off any git-resolvable hash, no DB required) and diff them directly — zero
  new DB rows, and the existing `diffCommits`/`GET /commits/:hash` routes
  are untouched.
- Consequently, this ships as **a new, separate read-only endpoint** (not by
  making the synthetic hash resolve through every existing commit route) —
  and the existing `ComparePage.vue` diff-rendering markup gets pulled out
  into a small shared component so the new preview panel can reuse it
  instead of re-implementing it.

## Implementation

### 1. `@saflib/git` — commit-building plumbing

New file(s) alongside `read-blob.ts`/`list-tree.ts` (same `execGit`/
`ReturnsError` style):
- `write-blob.ts`: `writeBlob(repoRoot, content): ReturnsError<string, GitCommandError>` → `git hash-object -w --stdin`.
- `scratch-tree.ts`: a small scratch-index helper built on a temp
  `GIT_INDEX_FILE` path — `openScratchIndex(repoRoot, baseHash)` (`git
  read-tree <baseHash>` into it), `setIndexEntry(handle, path, blobHash)`
  (`git update-index --cacheinfo 100644,<hash>,<path>`), `writeTree(handle)`
  (`git write-tree`), `closeScratchIndex(handle)` (delete the temp file).
- `commit-tree.ts`: `commitTree(repoRoot, treeHash, parentHash, message):
  ReturnsError<string, GitCommandError>`.
- `exec-git.ts`'s `ExecGitOptions` needs an `env?: Record<string,string>`
  passthrough (currently inherits `process.env` only) so these can set
  `GIT_INDEX_FILE` — small additive change to `execGit`/`execGitBuffer`.
- Export all of the above from `git/index.ts`.
- Tests: a scratch temp git repo (same pattern `git/index.test.ts` already
  uses) — write a blob, build a tree with one changed path, commit it,
  confirm `git cat-file -p` on the result matches, confirm the real repo's
  index/working tree are untouched.

### 2. `@saflib/new-workflows` — the preview walker

New `lib/preview/` module (depends on the new `@saflib/git` exports — add
`@saflib/git` to `new-workflows`'s `lib/package.json` deps; no existing
dependency cycle):

- `previewRun(dbKey, definition: WorkflowDefinition, input, options: { repoRoot: string; baseHash: string }): Promise<PreviewResult>`
  where `PreviewResult = { baseHash: string; finalHash: string; entries: PreviewStepEntry[] }`
  and `PreviewStepEntry = { workflowId: string; stepIndex: number; kind: string; applied: boolean; reason?: string }`
  (flat list across all recursion depth — `workflowId` says which nested
  workflow a given entry came from, for UI transparency).
- Mirrors `engine.ts`'s own context-building (`def.context({ input, cwd })`,
  `step.input({ context })`) but dispatches on `kind` instead of calling
  `step.run`:
  - `copy` / `transform-file`: materialize just the needed subtree from the
    *current* running commit hash (`listTree`-scoped `ls-tree -- targetDir`
    for copy, single `readBlob` for transform-file's `filePath`) into a
    fresh scratch temp dir, run the real unmodified `runCopyStep`/
    `runTransformFileStep` against it (with `ctx.cwd` swapped to the scratch
    root — see Context's note on why this is enough to retarget absolute
    destination paths without touching source template paths), then for
    every file the step wrote: `writeBlob`, `setIndexEntry`, and after the
    step finishes, `writeTree` + `commitTree` to advance the running hash.
    Delete the scratch dir immediately after.
  - `call-workflow`: call `step.input({ context })` to get `{
    targetDefinition, targetInput }` (same shape `call-workflow.ts` itself
    consumes) and recurse into `targetDefinition.steps` with a nested
    context built from `targetDefinition.context({ input: targetInput, cwd
    })` — no child run row is created, this is a pure walk.
  - anything else (`prompt`/`command`/`npm-script`/`update`): push a
    `{ applied: false, reason: "needs a real run" }` entry and move to the
    next step in the *same* list (don't abort).
- One scratch git index is opened once at the start of the whole walk and
  closed at the end — cheap incremental updates per step, never reloaded
  per-step.
- Tests: fixture workflows exercising a `copy` step, a `transform-file`
  step, a `call-workflow` step nesting one more level with its own copy
  step, and a `command` step interleaved between two previewable ones
  (asserting the walk continues past it) — run against a scratch temp git
  repo fixture (new `new-workflows`-side test helper, or reuse `@saflib/git`
  test's temp-repo setup if it's exported/exportable for tests).

### 3. `dev-site-http` — ephemeral diff endpoint

- Refactor `diff-commits.ts`: extract the "fetch/build an `AnalyzedSnapshot`
  for one hash" step (today: `getByHash` + `listByCommit` + `assembleCommitSymbols`
  + issue stats + db inventory) into its own function, separate from the
  pure list-diffing logic (`diffLists`, `metricsEqual`, the `commit_diff`
  assembly at the bottom). `diffCommits` keeps its current DB-backed
  behavior for real commits, unchanged.
- New `previewRunDiff(dbKey, runId, repo: RepoReadOptions):
  Promise<ReturnsError<CommitDiff, ...>>` in a new `preview-diff.ts`: loads
  the run (`new-workflows-db`), calls `previewRun` from `@saflib/
  new-workflows` to get `{ baseHash, finalHash, entries }`, computes an
  `AnalyzedSnapshot` for *both* `baseHash` and `finalHash` fresh via
  `analyzeCommit` (bypassing `getByHash`/`listByCommit` entirely — no DB
  rows read or written), and reuses the extracted diffing logic to build the
  same `CommitDiff` shape, plus the `entries` list for the "what wasn't
  covered" note.
- New route + spec, following `commits/diff.ts`'s pattern: `GET
  /api/workflows/runs/:runId/preview-diff` → `{ commit_diff: CommitDiff,
  entries: PreviewStepEntry[] }`. New `dev-site-spec` path/response schema
  (reuses the existing `commit-diff.yaml` schema for the diff itself; one
  small new schema for `PreviewStepEntry`).
- Tests: route test hitting a scratch git fixture repo + a fixture
  workflow, asserting the returned diff reflects the transform/copy output
  and `entries` lists the skipped steps; confirm no `analyzed_commits`/
  `package_metrics` rows exist afterward.

### 4. `dev-site-vue` — reuse the compare UI

- Extract `ComparePage.vue`'s `<template v-if="diff">` block (package
  metrics / exports / test cases / db schema sections) into a new
  `components/CommitDiffView.vue` taking `diff: CommitDiff` as a prop — pure
  refactor, `ComparePage.vue`'s behavior is unchanged (just now delegates
  rendering to the component). Update `ComparePage.test.ts` only if its
  selectors need adjusting for the extraction.
- New `requests/` call for `GET .../preview-diff` (`usePreviewDiffQuery` or
  a mutation, following `workflows-queries.ts`'s existing patterns —
  mutation is probably the better UX fit since it's triggered on demand,
  not auto-fetched).
- New "Preview changes" button in `RunView.vue`'s footer, next to the VCR
  controls. On click, calls the new query/mutation and renders the result
  via `<CommitDiffView>` plus a small list of the `entries` that weren't
  covered ("N step(s) need a real run: <label> (<workflowId>)").
- Tests: `RunView.test.ts` addition covering the button, a fixture
  `preview-diff` response, and the skipped-entries note rendering.

## Explicitly out of scope for this pass

- Making the synthetic hash resolve through the *other* existing commit
  routes (`GET /commits/:hash`, Timeline listing, clicking through history)
  — the new preview-diff endpoint is additive and separate, not a drop-in
  replacement for "just another commit" everywhere in dev-site.
- Any further memory/disk optimization beyond "materialize only the
  touched subtree, one step at a time" (e.g. streaming hash-object without
  a scratch file, parallelizing independent steps) — only worth doing if
  this proves too slow in practice.
- Converting `command`/`prompt`/`update`/`npm-script` into previewable,
  structured steps — stays a hard boundary for this pass; those steps are
  reported as skipped.

## Verification

- `cd git && npm test && npm run typecheck` — new plumbing helpers plus a
  scratch-repo integration test.
- `cd new-workflows/lib && npm test && npm run typecheck` — `previewRun`
  fixtures (copy, transform-file, nested call-workflow, skip-and-continue
  past a command step).
- `cd dev-site/dev-site-http && npm test && npm run typecheck` — the new
  `preview-diff.ts` route test, plus the existing `commits.test.ts` suite
  still green (confirms the `diff-commits.ts` refactor didn't change
  real-commit behavior).
- `cd dev-site/dev-site-vue && npm test && npm run typecheck` — `CommitDiffView`
  extraction (existing `ComparePage.test.ts` still passing), new
  `RunView.test.ts` preview coverage.
- Manual: run dev-site locally against a real todo-app plan, click "Preview
  changes" on a run that hasn't reached a `call-workflow` step yet, confirm
  the rendered diff matches what actually happens once the real step runs,
  and confirm the skipped-steps note lists the plan's `command`/`prompt`
  steps by name.
