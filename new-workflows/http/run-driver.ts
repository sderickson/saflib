import { readdirSync } from "node:fs";
import path from "node:path";
import createError from "http-errors";
import type { DbKey } from "@saflib/drizzle";
import { getByIdWorkflowRun } from "@saflib/new-workflows-db";
import { cancelRunAndDescendants, createRun, loadWorkflowDefinition } from "@saflib/new-workflows";
import type { WorkflowDrive } from "@saflib/new-workflows-spec";
import type { NewWorkflowsHttpContext } from "./context.ts";
import { advanceOnce, type AdvanceOnceOptions } from "./advance-once.ts";
import { publishRunChanged } from "./change-emitter.ts";

export type DriveRequestMode = Exclude<WorkflowDrive["mode"], "stop">;

/**
 * Advances a run in the background, as far as its mode says, without a
 * client: after each step it decides on its own whether to run the next
 * one, and in `plan` mode starts the folder's next phase file when a run
 * finishes. Before this lived here, the browser made those calls, so a
 * run stalled whenever its tab was closed, asleep or stuck behind other
 * requests.
 *
 * One run is driven at a time per database, in-process: a restart forgets
 * the driver (the run itself is unaffected, and can be driven again).
 */
export class RunDriver {
  #state: WorkflowDrive | undefined;
  #seq = 0;

  get state(): WorkflowDrive | undefined {
    return this.#state && structuredClone(this.#state);
  }

  /**
   * Starts driving `runId`, or only changes the mode when that run is
   * already being driven (a step is in flight, and the new mode decides
   * what happens after it). `options` apply to the first step only.
   */
  async drive(
    ctx: NewWorkflowsHttpContext,
    runId: string,
    mode: DriveRequestMode,
    options: AdvanceOnceOptions = {},
  ): Promise<WorkflowDrive> {
    const { result: run, error } = await getByIdWorkflowRun(ctx.dbKey, { id: runId });
    if (error) throw createError(404, "Run not found");

    // No awaits from here until the loop starts, so two requests can't
    // both find the driver idle.
    const current = this.#state;
    if (current?.active) {
      if (current.run_id !== runId) {
        throw createError(409, `Run ${current.run_id} is already being driven; stop it first.`);
      }
      current.mode = mode;
      return this.state!;
    }

    this.#state = {
      run_id: runId,
      workflow_ref: run.workflow_ref,
      mode,
      active: true,
      ...(current?.last_outcome ? { last_outcome: current.last_outcome } : {}),
    };
    void this.#loop(ctx, options);
    return this.state!;
  }

  /** Stops after the step in flight, cancelling its agent turn. */
  async stop(dbKey: DbKey): Promise<WorkflowDrive | undefined> {
    const current = this.#state;
    if (!current) return undefined;
    current.mode = "stop";
    if (current.active) await cancelRunAndDescendants(dbKey, current.run_id);
    return this.state;
  }

  async #loop(ctx: NewWorkflowsHttpContext, firstOptions: AdvanceOnceOptions): Promise<void> {
    const state = this.#state!;
    let options = firstOptions;
    try {
      for (;;) {
        const runId = state.run_id;
        let outcome: { status: string; message?: string };
        try {
          outcome = await advanceOnce(ctx, runId, options);
        } catch (error) {
          outcome = { status: "error", message: error instanceof Error ? error.message : String(error) };
        }
        options = {};
        state.last_outcome = {
          seq: ++this.#seq,
          run_id: runId,
          status: outcome.status,
          ...(outcome.message ? { message: outcome.message } : {}),
        };

        if (outcome.status === "success" && (state.mode === "workflow" || state.mode === "plan")) {
          continue;
        }
        if (outcome.status === "done" && state.mode === "plan") {
          const next = await this.#startNextPhase(ctx, runId, state.workflow_ref);
          if (next) {
            state.run_id = next.runId;
            state.workflow_ref = next.workflowRef;
            continue;
          }
        }
        return;
      }
    } finally {
      state.active = false;
      publishRunChanged(state.run_id);
    }
  }

  /** Creates a run for the next phase file in `workflowRef`'s plan folder, if there is one. */
  async #startNextPhase(
    ctx: NewWorkflowsHttpContext,
    finishedRunId: string,
    workflowRef: string,
  ): Promise<{ runId: string; workflowRef: string } | undefined> {
    const nextRef = nextPlanFile(ctx.defaultCwd, workflowRef);
    if (!nextRef) return undefined;
    const { result: finished } = await getByIdWorkflowRun(ctx.dbKey, { id: finishedRunId });
    const definition = await loadWorkflowDefinition(nextRef, ctx.registry, { cwd: ctx.defaultCwd });
    const runId = await createRun(ctx.dbKey, definition, {
      input: {},
      cwd: ctx.defaultCwd,
      mode: "run",
      // The same agent as the phase before it, but a new session.
      ...(finished?.agent_config?.cli ? { agentConfig: { cli: finished.agent_config.cli } } : {}),
    });
    return { runId, workflowRef: nextRef };
  }
}

/**
 * The workflow file that sorts next after `workflowRef` in the same folder,
 * as a path relative to `cwd` like `workflowRef` itself. Only plan files
 * (YAML) cascade; a registered code workflow's id has no folder.
 */
export function nextPlanFile(cwd: string, workflowRef: string): string | undefined {
  if (!/\.ya?ml$/i.test(workflowRef)) return undefined;
  const folder = path.dirname(workflowRef);
  const current = path.basename(workflowRef);
  let names: string[];
  try {
    names = readdirSync(path.join(cwd, folder));
  } catch {
    return undefined;
  }
  // Plain code-unit order, same as the plans list in the UI.
  const next = names.filter((name) => /\.ya?ml$/i.test(name) && name > current).sort()[0];
  return next ? path.join(folder, next) : undefined;
}

const drivers = new Map<DbKey, RunDriver>();

/** The driver for runs in `dbKey`'s database. */
export function getRunDriver(dbKey: DbKey): RunDriver {
  let driver = drivers.get(dbKey);
  if (!driver) {
    driver = new RunDriver();
    drivers.set(dbKey, driver);
  }
  return driver;
}
