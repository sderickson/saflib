import { describe, it, expect, vi, beforeEach } from "vitest";
import { stubGlobals } from "@saflib/vue/testing";
import { setupMockServer } from "@saflib/sdk/testing/mock";
import { http, HttpResponse } from "msw";
import RunPage from "./RunPage.vue";
import { mountTestApp } from "../test-app.ts";
import { router } from "./test_router.ts";

const ORIGIN = "http://localhost:3000";

// jsdom has no EventSource; `useRunEvents` opens one once a run exists.
class EventSourceStub {
  addEventListener() {}
  removeEventListener() {}
  close() {}
}

function runFixture(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "run-1",
    workflow_source: "code",
    workflow_ref: "example/hello",
    input: {},
    mode: "run",
    skip_todos: false,
    status: "pending",
    current_step_index: 0,
    cwd: "/repo",
    agent_config: { cli: "claude-agent" },
    parent_run_id: null,
    parent_step_index: null,
    created_at: "2026-09-15T00:00:00.000Z",
    updated_at: "2026-09-15T00:00:00.000Z",
    ...overrides,
  };
}

let runState = runFixture();
let logsState: unknown[] = [
  {
    id: "l1",
    run_id: "run-1",
    step_index: 0,
    channel: "tool",
    level: "info",
    content: "starting",
    created_at: "2026-09-15T00:00:00.000Z",
  },
];

const handlers = [
  http.get(`${ORIGIN}/api/runs/:runId`, () => HttpResponse.json({ run: runState })),
  http.get(`${ORIGIN}/api/runs/:runId/logs`, () => HttpResponse.json({ logs: logsState })),
];

describe("RunPage", () => {
  stubGlobals();
  const server = setupMockServer(handlers);

  beforeEach(() => {
    runState = runFixture();
    logsState = [
      {
        id: "l1",
        run_id: "run-1",
        step_index: 0,
        channel: "tool",
        level: "info",
        content: "starting",
        created_at: "2026-09-15T00:00:00.000Z",
      },
    ];
    vi.stubGlobal("EventSource", EventSourceStub);
  });

  it("shows run status and logs, and advances on click", async () => {
    let advanced = false;
    server.use(
      http.post(`${ORIGIN}/api/runs/:runId/advance`, () => {
        advanced = true;
        runState = runFixture({ status: "done", current_step_index: 1 });
        return HttpResponse.json({ status: "done" });
      }),
    );

    await router.push({ path: "/workflows/runs/run-1" });
    const wrapper = mountTestApp(RunPage);

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("Run run-1");
      expect(wrapper.text()).toContain("starting");
    });

    const advanceButton = wrapper.findAll("button").find((b) => b.text() === "Advance");
    expect(advanceButton).toBeTruthy();
    await advanceButton!.trigger("click");

    await vi.waitFor(() => {
      expect(advanced).toBe(true);
    });
  });

  it("shows a Stop button while the agent is running, and cancels on click", async () => {
    let cancelled = false;
    let resolveAdvance!: (value: unknown) => void;
    const advancePromise = new Promise((resolve) => {
      resolveAdvance = resolve;
    });
    server.use(
      http.post(`${ORIGIN}/api/runs/:runId/advance`, async () => {
        await advancePromise;
        return HttpResponse.json({ status: "error", message: "Cancelled by user" });
      }),
      http.post(`${ORIGIN}/api/runs/:runId/cancel`, () => {
        cancelled = true;
        resolveAdvance({});
        return HttpResponse.json({ cancelled: true });
      }),
    );

    await router.push({ path: "/workflows/runs/run-1" });
    const wrapper = mountTestApp(RunPage);

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("Run run-1");
    });
    const advanceButton = wrapper.findAll("button").find((b) => b.text() === "Advance");
    await advanceButton!.trigger("click");

    let stopButton;
    await vi.waitFor(() => {
      stopButton = wrapper.findAll("button").find((b) => b.text() === "Stop");
      expect(stopButton).toBeTruthy();
    });
    await stopButton!.trigger("click");

    await vi.waitFor(() => {
      expect(cancelled).toBe(true);
    });
  });
});
