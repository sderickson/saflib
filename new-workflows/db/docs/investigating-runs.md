# Investigating workflow runs

How to answer "why was this run slow / expensive / weird" from the workflow database.

## Getting the database

In the dev-site container it lives on a named volume at `/data/new-workflows/local.sqlite`. Copy it out rather than querying the live file:

```sh
mkdir -p /tmp/wfdb && docker cp <project>-dev-site-1:/data/new-workflows/. /tmp/wfdb/
sqlite3 /tmp/wfdb/local.sqlite
```

## Tables

| Table | One row per | Use it for |
|---|---|---|
| `workflow_run` | run; nested `call-workflow` children have `parent_run_id` | phase wall-clock (`created_at` → `updated_at`), final status |
| `workflow_step` | step attempt (retries add rows) | where time went; `label` says what the step was (`npm run typecheck`, `update: schema`); `commit_hash` links to its commit |
| `workflow_agent_turn` | agent CLI invocation | session reuse, model, API time, turn count, tokens, cost |
| `workflow_log` | output line | what happened inside a step |

Gotchas:

- `workflow_run`, `workflow_step`, and `workflow_log` timestamps are **unix seconds**. `workflow_agent_turn` timestamps are **milliseconds**.
- Logs are filed under the *root* run being advanced (`run_id`, `step_index`). For output from a nested child, filter on `source_run_id` / `source_step_index` instead.
- Agent tool calls are `agent`-channel rows whose `content` is JSON starting with `{"kind":"tool_use"`. Use `json_extract(content, '$.name')` and `'$.input.file_path'`.
- `call-workflow` steps span all their child's steps. Exclude them when summing step time, or you'll double-count.
- A gap between one step's `finished_at` and the next one's `started_at` is usually a person: a `pauseAfter` review, or a failed step waiting to be retried.

## Git history

Every step that changes files commits them. The message is built by `lib/commit-message.ts`:

```
results-payments 2.7.2 openapi/route(push-to-stripe) update: route

File: daemon/service/spec/routes/matter-finalizations/push-to-stripe.yaml
Step 2 of 5 in openapi/route (push-to-stripe), called from step 7 of
phase-2-stripe-invoice-items.workflow.yaml.
Agent: claude-agent, resumed session 3f2a9c1d, 4 turns, 38s, $0.06

Workflow-Plan: daemon/plans/notes/2026-10-14-results-payments
Workflow-Run: Bd0roKh92yfr
Workflow-Step: 2.7.2
Workflow-Source-Run: 9x2KqL0p
Workflow-Source: openapi/route
```

- **The address** `2.7.2` means phase 2, step 7, nested step 2. Step numbers are **1-based** (`step_index + 1`), matching the dev-site UI.
- **`Workflow-Run`** is always the root run. `Workflow-Source-Run` is the nested run that actually committed, present only when nested.
- **`workflow_step.commit_hash`** links each step to its commit. It's null when the step changed nothing.
- Commits made before this format (2026-10-15) use the old `<workflow>: <label>` subject and have no trailers.

```sh
git log --oneline --grep 'Workflow-Plan: daemon/plans/notes/2026-10-14-results-payments'  # a whole plan
git log --oneline --grep 'Workflow-Run: Bd0roKh92yfr'                                     # one phase
git log --format='%h %(trailers:key=Workflow-Step,valueonly,separator=)%x09%s' -20       # by address
```

## Queries

All root runs (phases) with wall-clock minutes:

```sql
select id, workflow_ref, status,
  datetime(created_at, 'unixepoch', 'localtime') created,
  round((updated_at - created_at) / 60.0, 1) mins
from workflow_run where parent_run_id is null order by created_at;
```

Time per phase, split into agent work, commands, and everything else:

```sql
with recursive tree(id, root) as (
  select id, id from workflow_run where parent_run_id is null
  union all select r.id, t.root from workflow_run r join tree t on r.parent_run_id = t.id)
select t.root,
  round(sum(case when s.kind in ('update','prompt') then s.finished_at - s.started_at end) / 60.0, 1) agent_mins,
  round(sum(case when s.kind = 'command' then s.finished_at - s.started_at end) / 60.0, 1) command_mins,
  round(sum(case when s.kind not in ('update','prompt','command','call-workflow') then s.finished_at - s.started_at end) / 60.0, 1) other_mins
from workflow_step s join tree t on s.run_id = t.id group by t.root;
```

Slowest steps, with what they were:

```sql
select run_id, step_index, kind, label, status, round((finished_at - started_at) / 60.0, 1) mins
from workflow_step where kind <> 'call-workflow' order by finished_at - started_at desc limit 20;
```

Agent turns for one phase: session reuse, time, cost:

```sql
select run_id, step_index, status, model, session_id, resumed_session_id is not null resumed,
  round((finished_at - started_at) / 1000.0) secs, round(api_duration_ms / 1000.0) api_secs,
  num_turns, cache_read_input_tokens, output_tokens, round(cost_usd, 3) cost
from workflow_agent_turn where session_run_id = :root_run_id order by started_at;
```

Files agents read more than once, and in how many separate steps:

```sql
with reads as (
  select source_run_id, source_step_index, json_extract(content, '$.input.file_path') fp
  from workflow_log
  where channel = 'agent' and content like '{"kind":"tool_use"%'
    and json_valid(content) and json_extract(content, '$.name') = 'Read')
select fp, count(*) reads, count(distinct source_run_id || ':' || source_step_index) steps
from reads group by fp having reads > 1 order by reads desc;
```
