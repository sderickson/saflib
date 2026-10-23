# Workflow workspace: run agents in a container-local clone

## Context

dev-site runs workflows in a container against the product checkout,
bind-mounted from the host at `/repo`. On Docker Desktop for macOS every
file operation on that mount crosses the VM's file sharing, so everything an
agent does there is slow: reading, searching, `git status`, committing.
Step commits alone took 11s and 23s at the start of one run, and the agent
waited on both.

Measured in the dev-site container, comparing the bind mount with a clone
of the same repo (plus its submodule) on the container's own disk:

| Operation                                    | `/repo` (bind mount) | Clone  |
| -------------------------------------------- | -------------------- | ------ |
| `git status --porcelain` (cold / warm)       | 4.7s / 0.57s         | 0.22s / 0.04s |
| `git status --ignore-submodules=dirty`       | 0.04s                | 0.02s  |
| `git add -A --dry-run`                       | 0.48s                | 0.02s  |
| `git commit --dry-run`                       | 0.55–0.77s           | 0.04s  |
| Whole step commit incl. gitleaks hook        | 3.5s warm, 11–23s seen | 0.4–0.5s |
| `find` all `.ts` files                       | 2.3s                 | 0.03s  |
| Read every `.ts` file                        | 5.8s                 | 0.06s  |
| `grep -r` over sources                       | 5.2s                 | 0.05s  |
| Initial clone (superproject + submodule)     | —                    | 5.5s   |

So file-heavy agent work is about 75–100× faster in a clone, and git is
about 10–20×. Running dev-site bare on the host would be just as fast, but
the point of the container is that workflow work stays contained.

## Goals

1. Agents, commands and step commits run against a checkout on fast,
   container-local disk.
2. Keep today's review loop: the user sees each step's commits on their
   branch, and can review (and edit) files while a run is paused.
3. **Submodule changes stay uncommitted.** Sometimes a run should invest in
   a submodule (the platform library). Today those edits land in the host
   submodule's working tree uncommitted, and the user reviews and commits
   them by hand. Keep that.
4. Dependencies are installed once and reused; only a lockfile change
   triggers a reinstall.
5. Running in place (no workspace) still works, for bare/local use and for
   tests.

Non-goal for now: parallel runs. One workspace, one advance at a time.
Worktrees of the workspace clone would make parallel runs cheap later, since
their shared `.git` would be on fast disk, but each would need its own
`node_modules`.

## Design

### Workspace

- A named volume (e.g. `workflow_workspace`) mounted at `/workspace`, holding
  one clone at `/workspace/repo`. Its remote `host` is `/repo`. Each
  submodule is cloned from the host submodule (`/repo/<path>`), so fetching
  never leaves the machine.
- Dependencies: install inside the workspace and record a hash of every
  `package-lock.json` in a marker file. Before an advance, reinstall only if
  the hash changed. A shared npm cache volume keeps reinstalls quick.
- A global workspace lock serializes advances across runs (today's lock is
  per run).

### The host is the source of truth between advances

The workspace is scratch space for the duration of one advance. Each
advance syncs in from the host first and syncs back out when it stops,
whether that's success, a pause for the user, a failure or a Stop.

**Sync in** (start of each advance):

1. Fetch the host's checked-out branch and reset the workspace to the
   host's `HEAD`. Do the same in each submodule, resetting to the commit
   the host submodule has checked out.
2. Carry over the host's **uncommitted** changes (the user's edits while
   reviewing, or WIP), in the superproject and in each submodule. Snapshot
   each host working tree **without touching it**: use a temporary
   `GIT_INDEX_FILE`, `add -A`, `write-tree` and `commit-tree`. This is the
   same plumbing the workflow preview uses. Fetch that dangling commit and
   check out its tree in the workspace as uncommitted changes.
   - This matches today's behavior: step commits already sweep up whatever
     is dirty in the checkout.
3. Record each workspace repo's starting point (the snapshot) for sync out.

**Sync out** (whenever the advance stops):

1. **Superproject commits.** Push the workspace branch to the host as
   `workflows/<run-id>`. Then fast-forward the host's checked-out branch to
   it (`merge --ff-only`). This works if the host `HEAD` hasn't moved since
   sync in and the user's uncommitted edits since then don't touch the same
   files. Otherwise leave the branch for the user and show it in the run
   view ("Run commits are on `workflows/<id>`; your branch moved").
2. **Submodule changes stay uncommitted.** For each submodule, take the
   workspace's change relative to its sync-in snapshot. Produce a binary
   diff with untracked files included via `add -N`, and apply it to the host
   submodule's working tree with `git apply --3way`. The host ends up with
   the run's edits as uncommitted changes on top of whatever it had, exactly
   as today. Conflicts happen only if the user edited the same lines during
   the advance; they're left as conflict markers and reported.
3. Any other uncommitted residue in the superproject (a failed step's
   leftovers) gets the same uncommitted-delta handling, so nothing is lost.
   Retry/revert already resets the workspace.

Step commits in the workspace never record submodule pointer changes,
because submodule edits stay uncommitted. That's already true today:
`commitIfDirty` can't stage them.

### Paths

- The run row keeps the host `cwd` (`/repo/...`). The engine maps it into
  the workspace for step execution, so run history stays meaningful when
  the workspace is off.
- Agent prompts and templates that hardcode `/repo` need a pass.
- `plansRoot` and plan creation write into the host. That's fine, because
  sync in picks them up as uncommitted changes.

### dev-site views

- Checkout, scan and the plan/docs views read the host repo, which is
  current after every sync out. No change needed for paused or finished
  runs.
- During an advance, anything that shows live file state (if anything
  does) would need to read the workspace. To verify.

### Configuration

`createNewWorkflowsRouter({ workspace?: { root: string } })`. Without it,
behavior is exactly today's (in place). dev-site enables it when a
`WORKFLOW_WORKSPACE` env var or volume is present; the dev-site compose
files add the volume.

## Phases

1. **Sync primitives** (lib, no engine changes): snapshot-without-touching,
   sync in and sync out for a repo with submodules. Tests use temp repos
   with a submodule and cover:
   - host WIP carried in;
   - submodule edits come back uncommitted;
   - fast-forward when safe, and the fallback branch when the host moved;
   - `--3way` conflicts reported.
2. **Workspace manager**: ensure the clone exists (and its submodules),
   the dependency install marker, and the global lock. Recover from a
   broken workspace by re-cloning.
3. **Engine integration**: wrap each advance in sync in / sync out
   (including the Stop and failure paths), map `cwd`, and route
   `revertUncommittedChanges` to the workspace. Log sync timings the same
   way commit timings are logged.
4. **dev-site wiring**: volumes, env, and run-view notices (where the
   commits went, conflicts, dependency reinstall in progress).
5. **Measure** a real plan run end to end, against the in-place baseline.

## Open questions

1. **Fast-forward the user's branch automatically?** I recommend yes when
   it's safe (that's today's experience), falling back to a
   `workflows/<id>` branch. The alternative is always a branch, with the
   user merging. Safer, but more clicks per step.
2. **Carry host WIP into runs?** I recommend yes, for parity with today:
   step commits already include everything dirty. The alternative is
   carrying only the run's own plan directory, so unrelated WIP never ends
   up in step commits. That's arguably better hygiene, but a behavior
   change.
3. **Which repos get the "stay uncommitted" treatment?** I recommend all
   submodules, so nothing names a particular one. The alternative is a
   configured list.
4. **Does any view need live mid-advance file state?** To check in phase 4.
