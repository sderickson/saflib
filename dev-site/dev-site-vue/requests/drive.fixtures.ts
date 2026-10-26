import { http, HttpResponse } from "msw";
import type { NewWorkflowsRequestBody } from "@saflib/new-workflows-spec";
import { drivePolling, type WorkflowDrive } from "./workflows-queries.ts";

type DriveBody = NewWorkflowsRequestBody["driveWorkflowRun"];

/**
 * MSW handlers standing in for the server's run driver. Each step goes
 * through `POST /api/runs/:runId/advance` and Stop through
 * `POST /api/runs/:runId/cancel`, so a test mocks those as before and
 * gets the server's chaining rules on top: keep going on `success` in
 * workflow/plan mode, and in plan mode start `nextPlanFile`'s run (through
 * `POST /api/workflows/:id/runs`) when one is `done`.
 *
 * Also shortens the client's polling of the driver. `restore` puts that
 * back and ends any drive still going, so it can't reach the next test's
 * handlers.
 */
export function fakeDriveHandlers(
  origin: string,
  options: { nextPlanFile?: (workflowRef: string) => string | undefined } = {},
) {
  let state: WorkflowDrive | undefined;
  let seq = 0;
  let disposed = false;
  const post = (url: string, body: unknown) =>
    fetch(`${origin}${url}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  async function loop(drive: WorkflowDrive, first: Omit<DriveBody, "mode">) {
    let advanceBody: Omit<DriveBody, "mode"> = first;
    try {
      for (;;) {
        // Lets timers run between steps, like real steps would.
        await new Promise((resolve) => setTimeout(resolve, 0));
        if (disposed) return;
        const runId = drive.run_id;
        const outcome = (await (await post(`/api/runs/${runId}/advance`, advanceBody)).json()) as {
          status: string;
          message?: string;
        };
        advanceBody = {};
        drive.last_outcome = {
          seq: ++seq,
          run_id: runId,
          status: outcome.status,
          ...(outcome.message ? { message: outcome.message } : {}),
        };
        if (outcome.status === "success" && (drive.mode === "workflow" || drive.mode === "plan")) {
          continue;
        }
        const next = outcome.status === "done" && drive.mode === "plan"
          ? options.nextPlanFile?.(drive.workflow_ref)
          : undefined;
        if (next) {
          const created = await post(`/api/workflows/${encodeURIComponent(next)}/runs`, {
            input: {},
            mode: "run",
          });
          drive.run_id = ((await created.json()) as { run: { id: string } }).run.id;
          drive.workflow_ref = next;
          continue;
        }
        return;
      }
    } finally {
      drive.active = false;
    }
  }

  const saved = { ...drivePolling };
  drivePolling.activeMs = 20;
  drivePolling.idleMs = 50;

  return {
    restore: () => {
      disposed = true;
      Object.assign(drivePolling, saved);
    },
    handlers: [
      http.post(`${origin}/api/runs/:runId/drive`, async ({ params, request }) => {
        const runId = params.runId as string;
        const { mode, ...rest } = (await request.json()) as DriveBody;
        if (state?.active) {
          if (state.run_id !== runId) {
            return HttpResponse.json({ message: "Another run is being driven" }, { status: 409 });
          }
          state.mode = mode;
          return HttpResponse.json({ drive: state }, { status: 202 });
        }
        const run = await fetch(`${origin}/api/runs/${runId}`).then(
          (r) => (r.ok ? (r.json() as Promise<{ run?: { workflow_ref?: string } }>) : undefined),
          () => undefined,
        );
        state = {
          run_id: runId,
          workflow_ref: run?.run?.workflow_ref ?? "",
          mode,
          active: true,
          ...(state?.last_outcome ? { last_outcome: state.last_outcome } : {}),
        };
        const response = HttpResponse.json({ drive: structuredClone(state) }, { status: 202 });
        void loop(state, rest);
        return response;
      }),
      http.get(`${origin}/api/drive`, () =>
        HttpResponse.json(state ? { drive: structuredClone(state) } : {}),
      ),
      http.post(`${origin}/api/drive/stop`, async () => {
        if (state) {
          state.mode = "stop";
          if (state.active) await post(`/api/runs/${state.run_id}/cancel`, {});
        }
        return HttpResponse.json(state ? { drive: structuredClone(state) } : {});
      }),
    ],
  };
}
