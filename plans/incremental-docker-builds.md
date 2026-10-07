# Incremental Docker builds: skip images whose inputs haven't changed

> **Living document.** Whoever works on this (human or agent) keeps the
> **Status** section and **Decisions log** current as work lands. If you pick
> this up cold, read Status first, then Design, then the next unchecked phase.

## Status

- **Phase:** all phases implemented (Phases 3–6 uncommitted in the working
  tree as of this update).
- **Last updated:** 2026-10-05
- **Next action:** owner reviews home-2026's migration (its own branch) and the
  saflib fixes it surfaced; then the other products (see **Follow-ups**).

| Phase | Description | State |
| ----- | ----------- | ----- |
| 1 | `@saflib/git` tree-hash helpers | done |
| 2 | `saf-docker inputs` + skip-rate measurement | done |
| 2b | Per-image lockfile pruning (decouple products) | done |
| 3 | Build metadata (`/etc/saf/builds/`) + OCI labels | done |
| 4 | `builds/` convention + upstream markers | done |
| 5 | `saf-docker build` / `status` orchestrator | done |
| 6 | Migrate dev + deploy scripts; deprecate `saf-git-hashes` | done |

## Context

Building Docker images is slow even when every layer is cached. Each build
still sends the context, checks every layer, exports the image, and (in deploy)
pushes it, for every image, every time. Most of the time most images' inputs
haven't changed.

Goal: build images per **build ref**, tie each image to the exact content it
was built from, and only rebuild when something the image depends on has
changed. Benefits dev (`base/dev/build-images.sh`), CI, and deploy
(`deploy/local-scripts/build.sh` + `push.sh`).

Separately (not this plan): reduce dev restarts with watch mode
(`tsx watch`/nodemon). Complementary, not a substitute.

### How things work today (as of 3ffecb23)

- `@saflib/monorepo` (`monorepo/src/workspace.ts`) builds the workspace
  dependency graph and finds `packagesWithDockerfileTemplates`, meaning packages
  with a `Dockerfile.template` at their root. One image per package.
- `@saflib/docker` `generateDockerfiles()` (`docker/src/docker.ts`) fills in
  templates:
  - `#{ copy_packages }#` → `COPY .saf-docker/stage/<image>/ ./` (staged,
    dev-dep-stripped `package.json`s + lockfile for `npm ci --omit=dev`).
  - `#{ copy_src }#` → `COPY --parents <transitive workspace dep dirs> ./`
    plus a `RUN` that installs git and runs `saf-git-hashes` if `.git` is
    present.
  - `#{ git_hashes }#`, `#{ package_root }#`.
  - Always adds `@saflib/docker` (+ deps) to every image so the
    `saf-git-hashes` CLI is present.
- Generated `Dockerfile`s and `.saf-docker/` are gitignored.
- `saf-git-hashes` (`docker/src/git-hashes.ts`) writes
  `{ root, saflib }` (product repo HEAD and saflib HEAD, each with a `-dirty`
  suffix if needed) to `saflib/node/git-hashes.json` and
  `saflib/vue/src/git-hashes.json`. Consumers:
  - `node/src/git-hashes.ts` `getGitHashes()` → used by
    `audit/audit-db/queries/audit-event/append.ts`.
  - `vue/src/git-hash.ts` (bundled into client JS via `import.meta.glob`).
  - `vendors/sentry-node/vite-build.ts` (Sentry release name).
- Build order is hand-written in bash with parallel `&`/`wait` and
  workflow-managed `BEGIN WORKFLOW AREA` blocks:
  - `base/dev/build-images.sh`: static-root, static sites, monolith, clients,
    and dev-site in parallel, then the caddy image
    (`FROM saflib-base-static-root:latest`).
  - `deploy/local-scripts/build.sh` (supports `native`/`amd64`), then
    `push.sh` pushes `:latest` tags.
- Products consume saflib as a nested directory (often a git submodule), which
  is why there are two hashes (`root`, `saflib`).

## Design

### Core idea: content-addressed input hash, not commit history

The question "has anything this image depends on changed since it was built?"
is answered by comparing **content**, not walking history. Git already
content-hashes every directory:

```
git rev-parse HEAD:base/service/monolith   # tree hash of that dir at HEAD
```

For each build ref we compute an **input hash** = sha256 over a sorted,
canonical list of `(input-path, content-hash)` pairs plus a few scalar inputs
(see below). The image is tagged `<image>:in-<first 16 hex of input hash>`.
**Needs rebuild = that tag does not exist** (locally:
`docker image inspect`; registry: `docker buildx imagetools inspect`).

Why this instead of `git diff <built-from-commit> HEAD -- <paths>`:

- Works with shallow CI clones (GitHub Actions defaults to depth 1). Only HEAD
  is needed.
- Holds up after rebase/squash/cherry-pick, which rewrite commits. Reverts hit
  the cache automatically.
- No need to first find out which commit the previous image was built from
  (which would mean pulling the image or reading registry metadata). The hash
  is computed locally and the registry only answers yes/no.
- Deterministic and easy to test.

The commit hash is still recorded in the image as **metadata** (see "Build
metadata"). It is never part of the input hash.

### Inputs to the hash

For build ref `R` of package `P`:

1. **Source trees.** Tree hash of each directory in
   `{P} ∪ getAllPackageWorkspaceDependencies(P)`. This is the same set
   `copy_src` copies today. Include `@saflib/docker` only if the image still
   needs it after Phase 6 (it probably won't).
2. **Staged install inputs.** Content hash of `.saf-docker/stage/<image>/`
   (staged root `package.json`, per-image lockfile, postinstall scripts). Hash
   this, **not** the root `package-lock.json`, so an unrelated dependency bump
   doesn't rebuild everything. Since Phase 2b, staging is **per image**: the
   lockfile is pruned to the image's dependency closure, and the root manifest
   is narrowed to the image's workspaces. So an image's staged inputs change
   only when its own dependencies do (see Phase 2b).
3. **The generated Dockerfile.** Gitignored, so hash the file on disk. This
   covers template changes and generator changes that affect output.
4. **Extra `COPY` sources** outside the dependency set, e.g. monolith copies
   `deploy/__product-name__/env.defaults` and `deploy/scripts/apply-env-defaults.sh`;
   `clients/root` copies SCSS/public from `clients/build`. The generator parses
   `COPY` source paths from the final Dockerfile (excluding `--from=` copies and
   the staged dir) and adds them as inputs. A test asserts every `COPY` source
   is covered by some input.
5. **Upstream images.** For `FROM <saf-image>` / `COPY --from=<saf-image>`
   referencing another build ref, include that ref's **input hash** (Merkle
   style). The DAG of refs is derived from these references.
6. **Scalars:** target platform (`linux/amd64` vs native arch), a
   `HASH_SCHEMA_VERSION` constant (bump to invalidate everything), and external
   base images as written in the Dockerfile (`node:24-slim`, `caddy:2.11.3`).
   Floating tags won't trigger rebuilds on upstream pushes. That's acceptable;
   use `--force` or pin by digest if it matters.

#### Uncommitted changes

A tree hash of HEAD ignores working-tree edits, which breaks local dev. Instead,
compute tree hashes from a **scratch index** seeded from HEAD, with the working
tree's tracked and untracked-not-ignored files under the input paths staged into
it (`GIT_INDEX_FILE=<tmp> git add -A -- <paths>` → `git write-tree` →
`git rev-parse <tree>:<path>`). `@saflib/git/scratch-tree.ts` already has the
scratch-index pattern. The real index and working tree are never touched. If
the result differs from HEAD's trees, metadata records `dirty: true`.

#### Gitignored-but-copied files

Tree hashes only see git-tracked content. Anything gitignored but *not*
dockerignored that lands in the build context would be invisible to the hash.
Today `.gitignore` and `.dockerignore` mostly agree (`dist`, `node_modules`,
`.vitepress/*`), but `**/*.d.ts` is gitignored and not dockerignored. Phase 2
must audit this: for each image, list files that would be in the context under
input paths and are gitignored, and either dockerignore them or confirm they
don't affect the image. Add a check so this stays true.

#### Nested repos (saflib as submodule)

When saflib is a submodule of a product repo, paths under `saflib/` must be
hashed against the saflib repo (`git -C saflib ...`), not the parent. The
helper resolves each input path to its containing repo (walk up to the nearest
`.git` file/dir, reusing `findProductRoot` logic) and hashes relative to that.

### Build metadata baked into images

Each build writes `/etc/saf/builds/<build-id>.json` as its **final layer**
(after everything else, so it never invalidates earlier layers and never feeds
the input hash):

```json
{
  "schema": 1,
  "buildRef": "@saflib/base-monolith/builds/prod",
  "image": "saflib-base-monolith-prod",
  "inputHash": "3f9a…",
  "commits": { "root": "<sha>", "saflib": "<sha>" },
  "dirty": false,
  "platform": "linux/amd64",
  "builtAt": "2026-10-05T12:00:00Z",
  "upstream": ["@saflib/base-clients/builds/static-root"]
}
```

- `<build-id>` = image name (filesystem-safe).
- Files from upstream images carry through via `FROM`. For multi-stage
  `COPY --from=<builder>`, the generator also copies
  `/etc/saf/builds/` from that stage, so the final image holds the full set
  (the "amalgamation").
- Values are passed as `--build-arg`s (`SAF_BUILD_INFO` JSON) consumed by a
  generated `RUN`/heredoc step at the end. Build args used only in the last
  layer don't bust earlier cache.
- The same values go into OCI labels (`org.opencontainers.image.revision`,
  `org.opencontainers.image.source`, `dev.saflib.input-hash`,
  `dev.saflib.build-ref`) so they can be read without running the image.
- `@saflib/node` gets a reader (`getBuildInfo()` → all files in
  `/etc/saf/builds/`, plus a "self" pick). `getGitHashes()` is reimplemented on
  top of it during migration.

**Reported version (decided):** a running image reports the commits it was
**built from**, which may be older than the deployed commit. That's accepted.
What gets reported stays the same as today: exactly two hashes, `root` (product
repo) and `saflib` (platform repo), taken from the image's own ("self") build
info. `GitHashes`, audit events and Sentry releases keep their current
`{ root, saflib }` shape. The other per-build files in `/etc/saf/builds/` are
diagnostics only and aren't reported. If images are later split into finer
layers than product/platform, revisit how versions are tracked and reported at
that point. Don't design for it now.

**Client bundles:** `vue/src/git-hash.ts` bakes hashes into JS. That's fine as
long as the value comes from the build arg *at build time of that image* and is
not an input. Since the image only rebuilds when its inputs change, the bundled
hash stays consistent with the image metadata. The current approach of writing
`git-hashes.json` into the source tree before the build must go, because it
would make the file an input that changes every commit.

### Build refs and the `builds/` convention

- A package can have any number of builds at
  `<package>/builds/<name>/Dockerfile.template`. The generated `Dockerfile` sits
  next to it (gitignored, as now).
- **Build ref:** `<npm-package-name>/builds/<name>`, e.g.
  `@saflib/base-monolith/builds/prod`. (No trailing `/Dockerfile`; the
  directory identifies the build.) Nested names are allowed
  (`builds/prod/arm`), and the ref is the path relative to the package root.
- **Image name:** `imageNameFromPackageName(pkg)` + `-` + name with `/` → `-`,
  with leading `_` and other invalid characters sanitized (the
  `__static-subdomain-name__` tag problem already exists in `build-images.sh`).
  `<image>:latest` is still tagged for compose compatibility.
- **Inputs are package-scoped:** all builds in a package share the package's
  dependency closure. Multiple builds per package are for variants that differ
  by Dockerfile (dev/prod, targets), not by dependencies. Packages that exist
  for dependency isolation (`clients/root`, `clients/build`, static sites) stay
  separate packages.
- **Back-compat:** a root-level `Dockerfile.template` is treated as build
  `default` (ref `<pkg>/builds/default`, image name unchanged) until migrated.
  `findPackagesWithDockerfileTemplates` becomes `findBuilds()` returning
  `{ packageName, buildName, templatePath }[]`.
- Optional per-build config `builds/<name>/build.json` (only if needed):
  `{ "extraInputs": [...], "platforms": [...] }`. Don't add until a real case
  needs it.

### CLI surface (`saf-docker`)

- `saf-docker generate` (exists) → also writes
  `.saf-docker/manifests/<image>.json`: inputs list, upstream refs, image name.
- `saf-docker inputs <ref> [--json] [--platform]` → prints the inputs, their
  hashes, and the final input hash. Pure and local. This is the debugging tool.
- `saf-docker status [refs…]` → per ref: input hash, exists locally? in
  registry? → `up-to-date | build | pull`.
- `saf-docker build [refs…|--all] [--platform] [--push] [--registry] [--force]
  [--concurrency N]`:
  1. generate Dockerfiles + manifests
  2. topologically sort the ref DAG
  3. for each ref, compute the input hash (upstream hashes first); if
     `:in-<hash>` exists locally, skip; else if `--registry` and it exists
     remotely, pull (or with `--push` just retag remotely via
     `imagetools create`); else build
  4. build with `--build-arg SAF_BUILD_INFO=…`, tag `:in-<hash>` and `:latest`
  5. `--push` pushes only tags that were newly built or retagged
  6. print a summary table (built / skipped / pulled, timings)
- Exit code nonzero if any build fails; independent branches continue.

### Implementation phases

#### Phase 1: `@saflib/git` tree-hash helpers

- `treeHash(repoRoot, rev, path)` → `git rev-parse <rev>:<path>`. Returns an
  error if the path doesn't exist at that rev.
- `workingTreeHashes(repoRoot, paths)` → `{ path → treeHash, dirty }` via a
  scratch index seeded from HEAD + `git add -A -- <paths>` +
  `write-tree`. Reuse/extend `scratch-tree.ts` (add an `addPaths` helper).
- `repoRootFor(path)` → nearest enclosing repo (handles submodule `.git`
  files).
- Follow existing conventions: `ReturnsError`, `execGit`, export from
  `git/index.ts`.
- Tests: scratch-repo integration tests covering clean, modified, untracked,
  ignored (excluded), deleted file, and submodule.

**As built** (`git/tree-hash.ts`, `git/list-ignored.ts`, tests in
`git/tree-hash.test.ts`):
- `treeHash`, `objectHashesAt` (batch, via `ls-tree`), `workingTreeHashes`,
  `repoRootFor`, `listIgnored`, all exported from `git/index.ts`.
- `workingTreeHashes` seeds its scratch index by **copying the real index**
  (to keep git's stat cache; about 150 ms for 6 package dirs in saflib), falling
  back to `read-tree HEAD`. Gotchas that cost time and now have tests:
  - The copy must **keep the real index's mtime**. Otherwise git's racy-clean
    check misses same-size edits made in the same second as the last index
    write (deterministic regression test pins mtimes).
  - Explicitly gitignored paths must be filtered out before `git add` (it
    rejects them). `check-ignore` doesn't accept `GIT_LITERAL_PATHSPECS`; only
    `add`/`rm` get it.
  - `cat-file --batch-check` reports submodule gitlinks as *missing*, because
    the commit isn't in the parent's object store. Use `ls-tree`. `ls-tree a
    a/b` descends into `a` instead of listing it, so overlapping paths are
    split into separate calls.

#### Phase 2: `saf-docker inputs` + measure

- `docker/src/inputs.ts`: given a `MonorepoContext` + build, compute the input
  list (items 1–6 above) and the hash. Upstream detection: parse `FROM`/`COPY
  --from` image names and map them to known builds by image name.
- Bin command `saf-docker inputs`.
- Gitignored-in-context audit (see above). Fix `.dockerignore` as needed.
- **Measurement (go/no-go gate, decided):** script that walks the last
  ~100 commits on main (`git worktree` or tree-only computation per commit;
  tree hashes at a commit don't need a checkout, but staged lockfile and
  generated Dockerfile do. Approximate those with the root lockfile hash and
  template hash for measurement) and reports per image how often the hash
  changed. Record results in this doc, then **stop and get an explicit go/no-go
  from the owner** before Phase 3. Phase 1–2 code (tree-hash helpers,
  `saf-docker inputs`) is useful as a diagnostic on its own either way. If the
  staged lockfile turns out to dominate the churn, flag it in the report.
  Lockfile pruning is decided at that point, not before.

**As built:**
- `docker/src/builds.ts`: `Build` type, `listBuilds` (package-root templates
  become the `default` build, image name unchanged), `findBuild` (ref or bare
  package name).
- `docker/src/inputs.ts`: `computeBuildInputs`. Inputs come from **parsing the
  generated Dockerfile's `COPY`/`ADD` sources**, which already contain the
  package dirs, extra copies and the staged dir, so no separate dependency
  walk is needed. Each source is hashed by git if git can see it, otherwise
  from disk (sha256, honoring `.dockerignore`). Also hashed: the Dockerfile
  itself, upstream builds (by image name, memoized, cycle-checked), platform,
  and `HASH_SCHEMA_VERSION`. Tag is `in-<16 hex>`. Also reports
  `externalImages` and `gitInvisibleContextFiles` (the audit).
- `docker/src/dockerignore.ts`: a small `.dockerignore` matcher, used for the
  audit and disk hashing.
- `docker/src/skip-rate.ts` + `saf-docker skip-rate [-n N] [--no-generate]
  [--json]`: the measurement, kept as a rerunnable tool. It re-derives the
  staged manifests per commit from the committed `package.json` +
  `package-lock.json`, reports several lockfile scenarios (see results),
  follows submodule gitlinks, and notes submodule commits missing from the
  local clone.
- `saf-docker inputs [refs…] [-v] [--json] [--platform] [--no-generate]`.
- **Audit fixes:** `.dockerignore` (saflib and
  `templates/scaffold/.dockerignore`) listed `dist` only at the root, so every
  package's `dist/types/` reached the context. Dev SQLite `-shm`/`-wal` files
  were also getting **copied into the monolith image**, plus workflow
  status/log files. All are now dockerignored, and the audit is clean for
  every saflib build. Generated `Dockerfile`s and `git-hashes.json` are exempt
  from the audit (the latter is expected until Phase 6).
- **Known limitation, needed for Phase 4:** upstream detection by image name
  doesn't work yet, because today's tags are hand-picked in bash
  (`saflib-base-static-root` vs package `@saflib/base-root-static`), so
  `base-dev` lists its upstreams as external images. Plan: templates name
  upstreams explicitly (e.g. `FROM #{ build @saflib/base-root-static/builds/default }#`)
  and the generator substitutes the tag. `deploy/Dockerfile.prod` isn't a
  template yet and will need the same treatment in Phase 6.
- saflib's own `base/*` templates resolve paths from saflib's root, so they
  don't resolve inside a product context. `skip-rate` skips unresolvable
  builds and lists them.
- `typedoc` isn't installed locally, so `saf-docs generate` failed and
  `docker/docs` and `git/docs` weren't regenerated. Do that with the next
  commit that has typedoc available.

#### Phase 2 results (2026-10-05)

Measured with `saf-docker skip-rate --no-generate -n 100` over the last 100
first-parent commits. Product repos (`~/src/*` with a saflib submodule) were
measured read-only from this checkout. Totals count only the product's own
builds; saflib's template builds inside products are unused and excluded.
"Skipped" means the share of (image × commit) pairs that wouldn't need a build.

| Repo | images | skipped today | + closure-pruned lockfile | ceiling (no lockfile churn) | saflib pointer bumped |
| ---- | -----: | ------------: | ------------------------: | --------------------------: | --------------------: |
| saflib (platform) | 7 | 36% | 38% | ~37% | n/a |
| product A | 6 | 38% | 47% | 50% | 63/100 commits |
| home-2026 | 12 | 30% | 41% | 49% | 53/89 |
| saf-2025 | 2 | 39% | 48% | 53% | 61/100 |
| product B | 4 | 24% | 27% | 31% | 45/100 |

- **Lockfile:** dropping `"dev": true` entries gains almost nothing (≤1 pt).
  Pruning each image's staged lockfile to the **production closure of its own
  workspace packages** gains 3–11 pts in products. Without it, a dependency
  bump anywhere rebuilds every image.
- **What drives source rebuilds** (product images, across image × commit
  pairs that rebuild for source reasons): saflib-only vs product-only vs both:
  product A 138/83/80, home-2026 155/172/213, saf-2025 32/28/40, product B
  15/104/90. **The saflib pointer moves in roughly half of all product
  commits** and is the single largest cause in product A. Product images
  already depend only on the saflib packages they use, so the remaining saflib
  churn is real dependency change.
- **Platform repo:** saflib's images each depend on ~50 packages, so nearly
  every platform commit rebuilds them (36% skipped).
- **Caveats:** commits are squash-merged PRs on main, which fits deploy/CI. The
  original pain is the dev loop: rebuilds between consecutive local restarts,
  where each change is usually one package. History can't measure that, but
  skip rates there should be much higher (e.g. a client-only edit skips the
  monolith and SDK images). The measurement also uses today's dependency sets
  for every historical commit.

#### Phase 2b: per-image lockfile pruning (decouple products)

Goal (owner, 2026-10-05): repos can hold many unrelated products, and one
product's dependency or workspace changes must not rebuild another's images.

**As built:**
- `docker/src/lockfile.ts`:
  - `lockClosure(packages, roots)`: lock entries reachable through production
    dependencies (`dependencies`, `optionalDependencies` for every platform,
    `peerDependencies`). Resolution follows node: `<dir>/node_modules/<name>`
    for **every ancestor directory**, not only at `node_modules` boundaries.
    That matters for products, e.g. `saflib/commander` resolving
    `saflib/node_modules/commander@15` over the root's `commander@14`.
  - `pruneLockfile`: keeps the closure from the root plus the image's
    workspaces, **each workspace's `node_modules/<name>` link entry** (npm
    requires these even when nothing depends on the workspace), and **every
    ancestor entry of a kept entry** (npm places `saflib/node_modules/x` under
    the `saflib` node, a workspace nothing depends on). It also strips
    `devDependencies` and narrows the root entry's `workspaces` and root
    dependencies.
  - `narrowRootPackageJson`: the staged root `workspaces` becomes the image's
    explicit workspace dirs (globs like `blog/**` would change whenever a
    product is added), and root dependencies on workspaces the image doesn't
    include are dropped. Root `overrides` stay, since they affect resolution
    for everyone.
- `docker/src/docker.ts`: `stageInstallManifests()` is the single pure staging
  function, used by `saf-docker generate` and by `skip-rate` (which now stages
  every historical commit exactly as builds do).
- Tests: `docker/src/lockfile.test.ts` covers the closure, link and ancestor
  retention, no input mutation, and the key property: **adding a product or
  bumping another product's dependency leaves an image's staged manifests
  byte-identical**.

**Verification done (2026-10-05):**
- Ran real `npm ci --omit=dev --ignore-scripts` on pruned stages for every
  image in saflib and four product repos (product stages
  were written to a temp dir; product repos untouched). Compared against the
  old unpruned staging: **no new `npm ls` problems in any image**. Installed
  sets are identical, or the pruned set is the old set minus packages the image
  can't reach. Example: one product's monolith drops from 830 to 736 packages,
  because its root's dependencies on `@saflib/vue` and its deploy package
  installed their trees into every image.
- Real `docker build` of `base/service/monolith` and `base/clients/root`.
  Inside the monolith, all 219 workspace production dependencies resolve
  (only test fixtures don't, and they never did). Inside static-root,
  `npm run build` (Vite, native Rollup binaries) succeeds.
- Staged lockfiles shrink to about 12–45% of the full lock (saflib monolith:
  361 of 1,858 entries).
- Side effect: `saf-docker sync-node-modules` keys dev volume resets off the
  stage hash, so dev `node_modules` volumes reset once after this change and
  less often afterwards.
- Pre-existing and not caused by this change: home-2026's
  `@sderickson/recipes-dev` fails `npm ci` with both old and new staging,
  because its lockfile predates the saflib commit its submodule checks out
  (missing `@saflib/*-workflows` packages).

**Measured effect** (`saf-docker skip-rate --no-generate -n 100`, product
builds only):

| Repo | images | skipped without pruning | **skipped with pruning** | ceiling (source only) |
| ---- | -----: | ----------------------: | -----------------------: | --------------------: |
| saflib | 7 | 36% | **39%** | ~37–47% per image |
| home-2026 | 12 | 31% | **39%** | 50% |
| product A | 6 | 38% | **48%** | 50% |
| saf-2025 | 2 | 39% | **48%** | 53% |
| product B | 4 | 24% | **27%** | 31% |

The remaining gap to the ceiling is genuine dependency change: the image's
own dependencies, saflib's dependencies, and root overrides.

#### Phases 3–6: as built (2026-10-05)

The user-facing reference is now `docker/docs/01-overview.md` (builds,
markers, `saf-docker build`, runtime build info, migration guide). Notes for
whoever continues:

**Phase 3, build metadata**
- `docker/src/metadata.ts` `buildMetadataStep()`: appended to every generated
  Dockerfile. It's the last layer, reached via `ARG SAF_BUILD_INFO`, and writes
  `/etc/saf/build.json` (self) plus `/etc/saf/builds/<image>.json`. It copies
  `/etc/saf/builds/` from stages built `FROM` (or `COPY --from`) another build,
  and switches to `USER root` and back when the final stage sets a user (kratos
  runs as 10000). The directory is created even without the arg, so downstream
  copies never fail.
- `saf-docker build` passes the info (`BuildInfo`: ref, image, input hash,
  `commits {root, saflib}` with `-dirty` when the image's inputs were dirty,
  platform, time, upstream refs) and OCI labels.
- Readers: `@saflib/node/git-hashes` `getBuildInfo()`, `listBuildInfos()`,
  `getGitHashes()` (build.json, then legacy `git-hashes.json`, then
  `unknown`; `SAF_BUILD_INFO_DIR` overrides `/etc/saf` for tests).
  `@saflib/vite` `makeConfig` defines `import.meta.env.SAF_GIT_HASHES` from
  it, and `@saflib/vue` `getGitHashes()` prefers that over the legacy JSON.
  Sentry and audit go through the node reader unchanged. Verified in real
  images: runtime `getGitHashes()` returns the build's commits, and the prod
  client bundle contains the commit hash.
- Removed from generation: the `@saflib/docker` source injected into every
  image, and the per-build `apt-get install git` + `saf-git-hashes` step.
  `#{ git_hashes }#` is now stripped.

**Phase 4, builds**
- `docker/src/builds.ts` `listBuilds()`: package-root templates are `default`
  builds; `builds/**/Dockerfile.template` are named builds. Optional
  `build.json` `{ image?, tags? }`. Derived image names are sanitized
  (`[^a-z0-9]+` → `-`), and duplicate image names are an error.
- `#{ image <ref|package> }#` marker → `<image>:latest`. The pattern is
  limited to package-name characters, so prose like `#{ image … }#` in
  comments is left alone.
- **Decision:** saflib's existing package-root templates were *not* moved into
  `builds/` (that would churn compose files, workflows and product init for no
  gain). `builds/` is used where a package has several builds (deploy).
- `base/dev/Dockerfile.template` names its static-site upstreams with markers;
  dev compose's caddy image is now the derived `saflib-base-dev`.
  `dev-site/dev-site-docker/build.json` keeps the published `saflib-dev-site`.

**Phase 5, `saf-docker build` / `status`**
- `docker/src/build-images.ts`: dependency-ordered scheduler, bounded
  concurrency, a failed upstream blocks its dependents. Per build: local
  `in-<hash>` → up to date (retag `latest`); else registry hit → pull (or only
  retag remotely when publishing with no downstream); else build. `--push`
  pushes `in-<hash>`, `latest` and `build.json` tags. Logs go to
  `.saf-docker/logs/<image>.log`.
- `native` is resolved to the daemon's `os/arch` for the hash (otherwise a
  Mac and a CI runner would share tags for different architectures).
- `docker/src/executor.ts`: `DockerExecutor` interface plus the `docker`/buildx
  CLI implementation; tests use a fake (`build-images.test.ts`).
- CLI: `build [refs…] [--dir p]… [--platform] [--registry] [--push]
  [--force] [--dry-run] [--concurrency]`; `status` = dry run. `--dir` is
  repeatable rather than variadic, so it can't swallow the refs after it.
- Verified for real in saflib: the first dev build of 6 images took ~61 s, the
  second ~7 s with everything skipped; a client-only edit rebuilt only the
  client/static images and `base-dev`. With a throwaway local registry, push
  published every tag, a second push only retagged, and after deleting local
  input tags the build **pulled** instead of rebuilding.

**Phase 6, scripts and workflows**
- `base/dev/package.json`: `build`/`dev`/`up` run
  `saf-docker build --dir .. @saflib/dev-site-docker` (in a product, `..` is
  the product dir); `dev-site` builds before `compose up` instead of
  `--build`. `build-images.sh` is deleted.
- `deploy/Dockerfile.prod` → `deploy/builds/caddy/Dockerfile.template`
  (`build.json` image `__organization-name__-caddy`); `Dockerfile.kratos` →
  `deploy/builds/kratos/` (image `__organization-name__-kratos`, tag
  `v26.2.0`). Published names are unchanged, so prod compose and remote
  scripts are untouched. Client stages use markers and `/app/base/...`
  paths; product init's renames (`@saflib/base`, `saflib-base`, `/base/`)
  turn them into the product's. Stage names embed `__product-name__` between
  letters (`clients__product-name__builder`) because Docker rejects `__`
  next to `-`. **The prod caddy image now actually builds inside saflib** (it
  never could before), which is how it was verified.
- `deploy/local-scripts/build.sh`: `saf-docker build --dir ./deploy
  <monolith refs> --platform … --registry …`, with monolith refs in a
  `deploy-builds FOR product/init` area. `push.sh` runs it with `--push`.
  `deploy` `status` script added. CI (`templates/scaffold/.github/workflows/push.yml`)
  needs no change and now gets registry hits.
- `vue/add-static-site` (both `vue/workflows` and `vue-workflows`): no longer
  edits `build-images.sh` or `deploy/local-scripts/build.sh` (builds are
  discovered); the deploy Caddy step targets `deploy/builds/caddy` and skips
  when that template is missing (unmigrated products).
- **Decision:** `saf-git-hashes` is **deprecated, not removed**. Existing
  products' copied scripts still call it, and their images read its JSON. It
  now prints a deprecation notice; nothing in saflib calls it.
- Tests updated: `product/workflows/base-stubs.test.ts`;
  `workflows-cli/live-test/sets.ts` now asserts the dev template's
  `#{ image @saflib/tmp-docs-static }#` marker (**live test not run**).

#### First product migration: home-2026 (2026-10-05)

home-2026 (branch `2026-10-05-docker-rework`) was migrated as the test case:
blog, recipes and hub, with notebook not yet a workspace or dockerized.
- **Per-site production builds.** `deploy/builds/{blog,recipes-static-root,recipes-clients,hub-clients}`
  each run one site's Vite/VitePress build `FROM` its client image and keep
  only the output, in a small `busybox` image. `deploy/builds/caddy` (image
  `sderickson-caddy`) only `COPY --from`s them. This is the pattern to use for
  products: building in the caddy Dockerfile would re-run every site's build
  whenever any one changes (and on fresh CI runners, with no layer cache).
- **Verified:** a blog-only edit rebuilds exactly `blog-client` → built blog
  site → caddy (assembly ~1 s); recipes client / recipes static site / hub
  client edits likewise touch only their own chain; a recipes *service* edit
  rebuilds only `hub-monolith` (which includes it). On a fresh machine with a
  warm registry, a blog-only `push.sh` built 3 images and took the other 7
  from the registry (~30 s).
- Published names kept via `build.json` (`sderickson-hub-clients`,
  `sderickson-recipes-clients`); `recipes/dev` caddy renamed to the derived
  `sderickson-recipes-dev`; `hub/dev` compose names its caddy image.
- Dev scripts use `saf-docker build --compose docker-compose.yaml`.

saflib fixes found by this migration:
- `--dir` without build refs selected **every** build (selection called
  `resolveBuilds(all, [])`). Selection now lives in `docker/src/select.ts`
  with tests.
- New `--compose <file>` selector (builds whose image a compose file uses):
  the right selection for dev. `--dir ..` also picked up unused standalone
  service images (`recipes-service` no longer builds on `node:alpine3.19`).
  saflib's `base/dev` scripts use it too.
- When pushing, registry hits are no longer pulled just because a
  downstream build exists; they're pulled lazily only when a build that
  actually runs needs them (outcome `in-registry`).
- Output (owner request): a check phase decides every image's action first
  and prints the plan; builds log start/finish; in a TTY each running build
  shows a live progress bar parsed from BuildKit `--progress=plain` step
  lines (`buildkitProgressTracker` in `executor.ts`, rendering in
  `bin/saf-docker/reporter.ts`).
- Output, round 2 (owner request): progress bars distinguish cached (`▒`)
  from rebuilt (`█`) steps (BuildKit `#N CACHED` vs `#N DONE`); finished and
  failed builds print step counts, log path and Docker Desktop link; every run
  writes `.saf-docker/build-report.md`. Gotcha: BuildKit pads stage names
  (`[stage-0  4/11]`), so the step pattern must allow multiple spaces.
- With `--registry`, local images also carry registry-qualified tags (the old
  `build.sh` did this), because `prod-local` compose runs against
  `$CONTAINER_REGISTRY/<image>:latest`.

#### `saf-deploy` (2026-10-05)

Products' copied deploy scripts (`deploy/local-scripts/*`, `deploy/remote-scripts/*`)
had drifted from saflib's: no rsync-based sync, no `--force-recreate`,
hand-maintained image lists in build/push/pull. They now live in saflib as
`@saflib/deploy-cli` → `saf-deploy` (`build`, `push`, `status`, `sync`,
`setup`, `pull`, `up`, `down`, `logs`, `purge`, `exec`, `release`), following
`@saflib/commander`'s bin conventions. See `deploy-cli/docs/01-overview.md`.
- **No image lists:** `build`/`push` select the builds whose images
  `remote-assets/docker-compose.prod.yaml` runs (`saf-docker build
  --compose`); the server's `pull` pulls that file's `$CONTAINER_REGISTRY`
  images.
- `saf-docker build`'s logic moved into `@saflib/docker`'s
  `src/run-build.ts` (`runImageBuild`) so both CLIs share it.
- `env.remote` stays the config; new optional `REMOTE_SUDO=0` (for hosts
  where remote commands shouldn't `sudo -i`). Remote scripts use `$SUDO` (empty when root).
- saflib's golden `deploy/` template now has only npm scripts calling
  `saf-deploy`. Fixed `product/init` renaming `@saflib/deploy-cli` (it
  rewrote any `@saflib/deploy…` prefix).
- Verified locally: payloads run in bash (export quoting, fail-fast),
  `pull` selection with a stub docker, `extract-assets` unzip+rsync, and
  home-2026's `status` / `build:native` through `saf-deploy`. **Not run
  against a real server** (`sync`/`up`/`release`).

**Rollout checklist per product** (home-2026 and two other single-product
repos done; lessons below are what generalized):
- Per-site production builds (`deploy/builds/<site>` building one static
  site and keeping only its output, plus a `caddy` build that only copies
  them in) work the same everywhere; published image names are kept with
  `build.json` `image`/`tags` (including custom kratos/alloy-style images).
- `npm run build` targets the production platform (amd64); `build:native`
  is opt-in for quick local runs.
- Some products' Playwright CI still called a removed saflib file
  (`saf-docker-cli.ts generate`) or a removed `build-no-generate` script;
  replace with `npm run build`.
- Check dependency graphs for over-broad deps: one static site depended on
  the whole SPA package just to read a shared SCSS file, so every SPA edit
  rebuilt it; copying that one file fixed it.
- Client builds that upload source maps need the **build secrets** feature
  (`build.json` `secrets`) for the Sentry token.
- Remote `sudo -i`: keep the default unless the product's old
  `exec-remote.sh` didn't use it (`REMOTE_SUDO=0`).
- conaudio (`conaudio/conaudio2`): update its saflib submodule first (not on
  the docker branch), then as above.
- A product on an older deploy layout is done too. What it needed: its saflib
  submodule moved off an old branch (already squash-merged into main);
  `env.remote` with the standard keys (it only had `SSH_HOSTNAME`, the rest
  was hardcoded in scripts; `REMOTE_SUDO=0` since it SSHes as root); prod
  compose switched from a literal registry to `$CONTAINER_REGISTRY/…`; the
  compose `--env-file .env.prod` replaced by `remote-assets/.env` (compose's
  default, so `saf-deploy up` needs no flag); generated `Dockerfile`s that had
  been committed were untracked and gitignored; a leftover package name on
  the deploy package fixed.
- Dev scripts are the next standardization candidate (`dev-compose.sh`,
  `sync-node-modules.sh`, `resolve-*.sh` vary per product, e.g. conaudio's
  `--no-attach mongo`).

### Follow-ups

1. **Migrate the remaining products** (conaudio); see the rollout
   checklist above for the pattern.
   Their dev/deploy scripts are copies that still use the old flow, which keeps
   working via the deprecated `saf-git-hashes`. Steps are in
   `docker/docs/01-overview.md` → "Migrating an existing product". Their
   hand-picked image names may differ from derived ones (e.g. a hand-picked
   `…-clients-root` vs the derived `…-root-static`), so check with
   `saf-docker status`.
2. Run the workflows live test (`workflows-cli/live-test`) to confirm
   `vue/add-static-site` + `product/init` against the new templates.
3. Remove `saf-git-hashes` and the legacy `git-hashes.json` fallbacks once
   products have migrated.
4. Garbage-collect old `in-*` tags locally and in the registry.
5. Optional: pin prod compose to `in-<hash>` tags instead of `latest`.
6. Open from Phase 2b: a shared SAF base image (see Open questions).
7. `typedoc` isn't installed locally, so typedoc reference docs (`docs/ref`)
   for `docker`, `git`, `node` and `vue` weren't regenerated (CLI docs were).

### Explicitly out of scope

- Adopting Bazel/Nx/Turborepo. The repo already has its own dependency graph;
  this is a few hundred lines in `@saflib/docker`.
- Dev hot-reload / watch mode (separate effort).
- A shared SAF base image that product images build `FROM` (see Open
  questions). Today each image holds its own copy of the saflib packages it
  uses plus their dependencies.
- Garbage-collecting old `:in-*` tags locally/in the registry (follow-up; note
  that local disk will grow).

### Verification

- `cd git && npm test && npm run typecheck`
- `cd docker && npm test && npm run typecheck`
- `cd monorepo && npm test && npm run typecheck`
- `cd node && npm test && npm run typecheck`
- Manual, dev: run `saf-docker build --all` twice. The second run builds
  nothing. Edit a file in `base/service/monolith`, and only monolith and its
  downstream images rebuild. Edit a file only the clients use, and monolith is
  skipped.
- Manual, deploy: `saf-docker status --registry …` after a no-op commit shows
  everything up to date. A container's `/etc/saf/builds/*.json` and
  `docker inspect` labels show the expected commit and input hash.

## Open questions

1. **Shared SAF layer?** Each image currently holds its own copy of the saflib
   packages it uses plus their installed dependencies. There is no shared SAF
   base image, so a product-only change rebuilds the whole image. A SAF layer
   (products `FROM` a saflib image) could reuse the dependency install, but:
   npm workspaces hoist into one `node_modules`, and `npm ci` wipes it, so a
   second install on top needs a different approach (e.g. `npm install` over
   a prepared tree, or separate install roots); Vite bundles saflib code into
   client output, so only the install could be shared for clients; and the
   saflib pointer moves in about half of product commits, which caps the
   reuse. This would also reopen "only report root + saflib hashes".

## Decisions log

- 2026-10-05: Use content-addressed input hashes (git tree hashes + staged
  file hashes) instead of commit-history diffing. Reasons: shallow clones,
  rebases/squashes, no need to look up the previous build's commit. Commit
  hashes remain as metadata only.
- 2026-10-05: Build metadata lives in `/etc/saf/builds/<build-id>.json`
  (one file per build that contributed to the image) plus OCI labels, written
  as the final layer from a build arg.
- 2026-10-05 (owner review):
  - **Reported version = built-from commits.** Keep reporting only
    `{ root, saflib }` (product + platform repos), taken from the image's own
    build. If builds get split into finer layers later, revisit tracking and
    reporting then.
  - **Build ref format:** `<npm-package-name>/builds/<name>` (no trailing
    `/Dockerfile`).
  - **Registry existence checks** from CI/deploy are approved. Reuse the
    existing push auth.
  - **Phase 2 is a go/no-go gate.** Report the skip-rate measurements and get
    an explicit decision before Phase 3.
  - **Lockfile pruning** stays out of scope. Revisit only if Phase 2
    measurement shows lockfile churn dominates.
- 2026-10-05 (Phase 1–2 implementation):
  - Inputs come from the generated Dockerfile's `COPY`/`ADD` sources rather
    than a separate dependency walk. The Dockerfile already lists exactly
    what enters the image.
  - Git-invisible context content gets fixed in `.dockerignore`, not
    tolerated. The audit runs as part of `saf-docker inputs`.
  - `skip-rate` stays in the CLI as a rerunnable diagnostic (useful for
    re-measuring in product repos after changes).
- 2026-10-05 (owner): **Lockfile pruning is in scope**, motivated by wanting
  large repos with many unrelated products, so product builds must be
  decoupled from one another. Implemented as Phase 2b.
- 2026-10-05 (Phase 2b): Staging is a single pure function
  (`stageInstallManifests`) shared by the generator and `skip-rate`, so
  measurements always match real builds. The staged root `workspaces` lists
  the image's dirs explicitly instead of the repo's globs.
- 2026-10-05 (owner): go on Phases 3–6. Shared SAF layer left open.
- 2026-10-05 (Phases 3–6): see "Phases 3–6: as built" for the decisions:
  package-root templates stay put (no mass move into `builds/`); upstreams
  named with `#{ image … }#`; `native` platform resolved to `os/arch` for
  hashing; `saf-git-hashes` deprecated rather than removed; deploy
  caddy/kratos keep their published names via `build.json`.
