import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { nextTick } from "vue";
import { enableAutoUnmount } from "@vue/test-utils";
import { stubGlobals } from "@saflib/vue/testing";
import { setupMockServer } from "@saflib/sdk/testing/mock";
import { http, HttpResponse } from "msw";
import RunView from "./RunView.vue";
import { mountTestApp } from "../test-app.ts";
import { router } from "../pages/test_router.ts";
import * as runAlerts from "../run-alerts.ts";
import { __resetRunOrchestratorForTests } from "../run-orchestrator.ts";

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
    is_advancing: false,
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
let stepsState: unknown[] = [
  { index: 0, kind: "cd", label: "cd test-product/service/db" },
  { index: 1, kind: "prompt", label: "Say hello!" },
];

const handlers = [
  http.get(`${ORIGIN}/api/runs/:runId`, () => HttpResponse.json({ run: runState })),
  http.get(`${ORIGIN}/api/runs/:runId/logs`, ({ request }) => {
    const url = new URL(request.url);
    const before = url.searchParams.get("before");
    const since = url.searchParams.get("since");
    const limit = Number(url.searchParams.get("limit") ?? 100);
    type LogRow = { id: string; created_at: string };
    let rows = [...(logsState as LogRow[])];
    if (since) rows = rows.filter((l) => l.created_at > since);
    if (before) rows = rows.filter((l) => l.created_at < before);
    // API contract: newest first.
    rows.sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0));
    const page = rows.slice(0, limit);
    return HttpResponse.json({ logs: page, has_more: rows.length > limit });
  }),
  http.get(`${ORIGIN}/api/runs/:runId/steps`, () => HttpResponse.json({ steps: stepsState })),
  http.get(`${ORIGIN}/api/runs/:runId/step-tree`, () =>
    HttpResponse.json({
      steps: (stepsState as { index: number; kind: string; label?: string }[]).map((s) => ({
        path: String(s.index),
        index: s.index,
        kind: s.kind,
        label: s.label,
        isCurrent: s.index === (runState.current_step_index as number),
        runId: runState.id,
      })),
    }),
  ),
  http.get(`${ORIGIN}/api/workflows/:id/steps`, () => HttpResponse.json({ steps: stepsState })),
];

function emptyCommitDiff(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    from_hash: "base",
    to_hash: "preview",
    package_metrics: { added: [], removed: [], changed: [] },
    exports: { added: [], removed: [] },
    test_cases: { added: [], removed: [] },
    db_schemas: {
      tables: { added: [], removed: [] },
      columns: { added: [], removed: [], changed: [] },
    },
    ...overrides,
  };
}

function mountRunView(props: { runId?: string; workflowRef?: string } = {}) {
  return mountTestApp(RunView, {
    props: { workflowRef: "example/hello", runId: "run-1", ...props },
  });
}

describe("RunView", () => {
  stubGlobals();
  const server = setupMockServer(handlers);
  // Vuetify's `v-dialog` teleports to the real `document.body`, which
  // otherwise survives across tests (and files, under this suite's
  // `isolate: false`) since nothing else unmounts a previous test's wrapper.
  enableAutoUnmount(afterEach);

  beforeEach(() => {
    __resetRunOrchestratorForTests();
    runState = runFixture({ status: "running" });
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
    stepsState = [
      { index: 0, kind: "cd", label: "cd test-product/service/db" },
      { index: 1, kind: "prompt", label: "Say hello!" },
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

    const wrapper = mountRunView();

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("starting");
    });

    const continueButton = wrapper.find('[aria-label="Play current step"]');
    expect(continueButton.exists()).toBe(true);
    await continueButton.trigger("click");

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

    const wrapper = mountRunView();

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("starting");
    });
    const continueButton = wrapper.find('[aria-label="Play current step"]');
    await continueButton.trigger("click");

    let stopButton;
    await vi.waitFor(() => {
      stopButton = wrapper.find('[aria-label="Stop"]');
      expect(stopButton.exists()).toBe(true);
    });
    await stopButton!.trigger("click");

    await vi.waitFor(() => {
      expect(cancelled).toBe(true);
    });
  });

  it("does not yank the scroll position back down once the user has scrolled away from the bottom", async () => {
    server.use(
      http.post(`${ORIGIN}/api/runs/:runId/advance`, () => {
        logsState = [
          ...logsState,
          {
            id: "l2",
            run_id: "run-1",
            step_index: 0,
            channel: "tool",
            level: "info",
            content: "more output",
            created_at: "2026-09-15T00:00:01.000Z",
          },
        ];
        return HttpResponse.json({ status: "success", result: {} });
      }),
    );

    const wrapper = mountRunView();

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("starting");
    });

    const el = wrapper.find(".run-view__logs").element as HTMLElement;
    // jsdom doesn't compute real layout — fake a tall, scrolled-up container.
    Object.defineProperty(el, "scrollHeight", { value: 1000, configurable: true });
    Object.defineProperty(el, "clientHeight", { value: 200, configurable: true });
    Object.defineProperty(el, "scrollTop", { value: 100, writable: true, configurable: true });
    el.dispatchEvent(new Event("scroll"));

    const continueButton = wrapper.find('[aria-label="Play current step"]');
    await continueButton.trigger("click");

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("more output");
    });
    // Would be forced to 1000 (scrollHeight) if the page auto-scrolled.
    expect(el.scrollTop).toBe(100);
  });

  it("shows a step sidebar, highlights the step at the bottom of the view, and marks the last agent-input sticky", async () => {
    logsState = [
      {
        id: "l1",
        run_id: "run-1",
        step_index: 0,
        channel: "agent-input",
        level: "info",
        content: "Do the first thing",
        created_at: "2026-09-15T00:00:00.000Z",
      },
      {
        id: "l2",
        run_id: "run-1",
        step_index: 1,
        channel: "agent-input",
        level: "info",
        content: "Do the second thing",
        created_at: "2026-09-15T00:00:01.000Z",
      },
    ];

    const wrapper = mountRunView();

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("cd test-product/service/db");
      expect(wrapper.text()).toContain("Say hello!");
    });

    // Only the most recent agent-input entry is sticky.
    const items = wrapper.findAll(".run-view__log-item");
    const stickyItems = items.filter((i) => i.classes().includes("run-view__log-item--sticky"));
    expect(stickyItems).toHaveLength(1);
    expect(stickyItems[0].text()).toContain("Do the second thing");

    // Fake layout: item 0 (step 0) fills almost the whole viewport starting
    // at its very top; item 1 (step 1) only just peeks over the viewport's
    // *bottom* edge. A top-of-viewport rule would pick item 0 (it's the one
    // at the top); a bottom-of-viewport rule picks item 1.
    const itemEls = items.map((i) => i.element as HTMLElement);
    vi.spyOn(itemEls[0], "getBoundingClientRect").mockReturnValue({
      top: 0,
      bottom: 490,
    } as DOMRect);
    vi.spyOn(itemEls[1], "getBoundingClientRect").mockReturnValue({
      top: 490,
      bottom: 600,
    } as DOMRect);
    const el = wrapper.find(".run-view__logs").element as HTMLElement;
    vi.spyOn(el, "getBoundingClientRect").mockReturnValue({ top: 0, bottom: 500 } as DOMRect);
    el.dispatchEvent(new Event("scroll"));
    await nextTick();

    const sidebarSteps = wrapper.findAll(".run-view__sidebar-step");
    expect(sidebarSteps[1].classes()).toContain("run-view__sidebar-step--active");
    expect(sidebarSteps[0].classes()).not.toContain("run-view__sidebar-step--active");
  });

  it("colors sidebar steps by the run's progress, and lists each step's params", async () => {
    runState = runFixture({ current_step_index: 1 });
    stepsState = [
      { index: 0, kind: "cd", label: "cd test-product/service/db", params: { path: "test-product/service/db" } },
      {
        index: 1,
        kind: "call-workflow",
        label: "drizzle/update-schema",
        params: { path: "./schemas/todo.ts", prompt: "Add a title column" },
      },
      { index: 2, kind: "command", label: "npm test" },
    ];

    const wrapper = mountRunView();

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("drizzle/update-schema");
    });

    const sidebarSteps = wrapper.findAll(".run-view__sidebar-step");
    // Step 0 already ran (current_step_index is 1) -> done.
    expect(sidebarSteps[0].classes()).toContain("run-view__sidebar-step--done");
    expect(sidebarSteps[0].classes()).not.toContain("run-view__sidebar-step--running");
    // Step 1 is the current one -> running.
    expect(sidebarSteps[1].classes()).toContain("run-view__sidebar-step--running");
    expect(sidebarSteps[1].classes()).not.toContain("run-view__sidebar-step--done");
    // Step 2 hasn't been reached -> neither.
    expect(sidebarSteps[2].classes()).not.toContain("run-view__sidebar-step--done");
    expect(sidebarSteps[2].classes()).not.toContain("run-view__sidebar-step--running");

    // No raw "call-workflow: ..." blob in the label — just the target id —
    // with its input broken out into its own list instead.
    expect(sidebarSteps[1].text()).not.toContain("call-workflow");
    const params = sidebarSteps[1].findAll(".run-view__sidebar-step-param");
    expect(params.map((p) => p.text())).toEqual(["path: ./schemas/todo.ts", "prompt: Add a title column"]);
  });

  it("offers Continue (Play)/Revert & Continue/Skip Step when failed, sending the right options and extra prompt", async () => {
    runState = runFixture({ status: "failed" });
    let lastBody: unknown;
    server.use(
      http.post(`${ORIGIN}/api/runs/:runId/advance`, async ({ request }) => {
        lastBody = await request.json();
        return HttpResponse.json({ status: "success", result: {} });
      }),
    );

    const wrapper = mountRunView();

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("failed");
    });

    // The universal Play/Continue button stays enabled even while failed —
    // it's the same "just retry as-is" action a dedicated Retry button used
    // to be.
    const continueButton = wrapper.find('[aria-label="Play current step"]');
    expect(continueButton.exists()).toBe(true);
    expect(continueButton.attributes("disabled")).toBeFalsy();
    const revertButton = wrapper.findAll("button").find((b) => b.text().includes("Revert"));
    const skipButton = wrapper.findAll("button").find((b) => b.text() === "Skip Step");
    expect(revertButton).toBeTruthy();
    expect(skipButton).toBeTruthy();

    const textarea = wrapper.find("textarea");
    await textarea.setValue("Use ignorePlural, it's already singular.");
    await revertButton!.trigger("click");

    await vi.waitFor(() => {
      expect(lastBody).toEqual({
        revert: true,
        extraPrompt: "Use ignorePlural, it's already singular.",
      });
    });
  });

  it("Go to Step opens a modal and posts the clicked path", async () => {
    runState = runFixture({ status: "failed", current_step_index: 1 });
    let gotoBody: unknown;
    server.use(
      http.post(`${ORIGIN}/api/runs/:runId/goto`, async ({ request }) => {
        gotoBody = await request.json();
        return HttpResponse.json({
          run: { ...runState, current_step_index: 0, status: "pending" },
          path: (gotoBody as { path: string }).path,
        });
      }),
    );

    const wrapper = mountRunView();

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("Go to Step");
    });

    const gotoButton = wrapper.findAll("button").find((b) => b.text() === "Go to Step");
    expect(gotoButton).toBeTruthy();
    await gotoButton!.trigger("click");
    await nextTick();

    // Dialog is teleported to document.body (same as the Reset confirm).
    await vi.waitFor(() => {
      expect(document.body.textContent).toContain("Go to step");
      expect(document.body.querySelectorAll(".run-view__goto-tree-row").length).toBeGreaterThan(0);
    });

    const firstRow = document.body.querySelector(".run-view__goto-tree-row") as HTMLElement;
    firstRow.click();

    await vi.waitFor(() => {
      expect(gotoBody).toEqual({ path: "0" });
    });
  });

  it("Play current workflow (FF) kicks off immediately and keeps chaining while each step succeeds", async () => {
    let advanceCount = 0;
    server.use(
      http.post(`${ORIGIN}/api/runs/:runId/advance`, () => {
        advanceCount++;
        // Third call finishes the run — the chain should then stop on its own.
        if (advanceCount >= 3) return HttpResponse.json({ status: "done" });
        return HttpResponse.json({ status: "success", result: {} });
      }),
    );

    const wrapper = mountRunView();
    // Depends on the run query having actually resolved.
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("starting");
    });

    const ffButton = wrapper.find('[aria-label="Play current workflow"]');
    expect(ffButton.exists()).toBe(true);
    await ffButton.trigger("click");

    await vi.waitFor(() => {
      expect(advanceCount).toBe(3);
    });
  });

  it("Stop force-cancels a chain in flight, and it doesn't resume afterward", async () => {
    let advanceCount = 0;
    let resolveFirst!: () => void;
    const firstCallStarted = new Promise<void>((resolve) => {
      resolveFirst = resolve;
    });
    server.use(
      http.post(`${ORIGIN}/api/runs/:runId/advance`, async () => {
        advanceCount++;
        if (advanceCount === 1) {
          resolveFirst();
          // Hold the first call open until the test cancels it.
          await new Promise((r) => setTimeout(r, 20));
        }
        return HttpResponse.json({ status: "success", result: {} });
      }),
      http.post(`${ORIGIN}/api/runs/:runId/cancel`, () => HttpResponse.json({ cancelled: true })),
    );

    const wrapper = mountRunView();
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("starting");
    });

    await wrapper.find('[aria-label="Play current workflow"]').trigger("click");
    await firstCallStarted;
    // Force-stop while the first call is still in flight.
    await wrapper.find('[aria-label="Stop"]').trigger("click");

    // Give any (wrongly) chained call a chance to fire before asserting none did.
    await new Promise((r) => setTimeout(r, 50));
    expect(advanceCount).toBe(1);
  });

  it("plays a sound and shows a notification when the run finishes on its own", async () => {
    const bellSpy = vi.spyOn(runAlerts, "playSuccessBell").mockImplementation(() => {});
    const notifySpy = vi.spyOn(runAlerts, "notify").mockImplementation(() => {});
    server.use(
      http.post(`${ORIGIN}/api/runs/:runId/advance`, () => {
        runState = runFixture({ status: "done", current_step_index: 2 });
        return HttpResponse.json({ status: "done" });
      }),
    );

    const wrapper = mountRunView();
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("starting");
    });

    const continueButton = wrapper.find('[aria-label="Play current step"]');
    await continueButton.trigger("click");

    await vi.waitFor(() => {
      expect(bellSpy).toHaveBeenCalledTimes(1);
    });
    expect(notifySpy).toHaveBeenCalledTimes(1);
    expect(notifySpy.mock.calls[0][0]).toContain("finished");
  });

  it("Play current workflow stops on awaiting_user without a failure sound", async () => {
    let advanceCount = 0;
    const quackSpy = vi.spyOn(runAlerts, "playFailureQuack").mockImplementation(() => {});
    const notifySpy = vi.spyOn(runAlerts, "notify").mockImplementation(() => {});
    server.use(
      http.post(`${ORIGIN}/api/runs/:runId/advance`, () => {
        advanceCount++;
        runState = runFixture({ status: "awaiting_user" });
        return HttpResponse.json({
          status: "awaiting_user",
          message: "Spec is written. Review it, then continue.",
        });
      }),
    );

    const wrapper = mountRunView();
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("starting");
    });

    await wrapper.find('[aria-label="Play current workflow"]').trigger("click");

    await vi.waitFor(() => {
      expect(notifySpy).toHaveBeenCalled();
    });
    expect(advanceCount).toBe(1);
    expect(quackSpy).not.toHaveBeenCalled();
    expect(notifySpy.mock.calls[0][0]).toContain("Paused");
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("Review it");
    });
  });

  it("plays a different sound and notification when the run fails on its own", async () => {
    const quackSpy = vi.spyOn(runAlerts, "playFailureQuack").mockImplementation(() => {});
    const notifySpy = vi.spyOn(runAlerts, "notify").mockImplementation(() => {});
    server.use(
      http.post(`${ORIGIN}/api/runs/:runId/advance`, () => {
        runState = runFixture({ status: "failed" });
        return HttpResponse.json({ status: "error", message: "it broke" });
      }),
    );

    const wrapper = mountRunView();
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("starting");
    });

    const continueButton = wrapper.find('[aria-label="Play current step"]');
    await continueButton.trigger("click");

    await vi.waitFor(() => {
      expect(quackSpy).toHaveBeenCalledTimes(1);
    });
    expect(notifySpy).toHaveBeenCalledTimes(1);
    expect(notifySpy.mock.calls[0][1]).toBe("it broke");
  });

  it("does not replay sound/notification for a run that was already finished when the page loaded", async () => {
    const bellSpy = vi.spyOn(runAlerts, "playSuccessBell").mockImplementation(() => {});
    const quackSpy = vi.spyOn(runAlerts, "playFailureQuack").mockImplementation(() => {});
    runState = runFixture({ status: "done", current_step_index: 2 });

    const wrapper = mountRunView();
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("starting");
    });
    // Give any (wrongly) fired watcher a chance to run.
    await new Promise((r) => setTimeout(r, 20));

    expect(bellSpy).not.toHaveBeenCalled();
    expect(quackSpy).not.toHaveBeenCalled();
  });

  it("mute button toggles run-alerts' persisted mute state and its own icon/label", async () => {
    localStorage.clear();
    runAlerts.__resetRunAlertsStateForTests();

    const wrapper = mountRunView();
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("starting");
    });

    const muteButton = wrapper.find('[aria-label="Mute"]');
    expect(muteButton.exists()).toBe(true);

    await muteButton.trigger("click");

    expect(runAlerts.isMuted()).toBe(true);
    expect(wrapper.find('[aria-label="Unmute"]').exists()).toBe(true);

    await wrapper.find('[aria-label="Unmute"]').trigger("click");
    expect(runAlerts.isMuted()).toBe(false);
  });

  it("volume slider persists via run-alerts.setVolume", async () => {
    localStorage.clear();
    runAlerts.__resetRunAlertsStateForTests();

    const wrapper = mountRunView();
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("starting");
    });

    const slider = wrapper.find('[aria-label="Alert volume"]');
    expect(slider.exists()).toBe(true);

    await wrapper.findComponent({ name: "VSlider" }).vm.$emit("update:modelValue", 0.9);

    expect(runAlerts.getVolume()).toBeCloseTo(0.9);
  });

  it("reflects a step actively in progress server-side even on a fresh mount (no local pending mutation)", async () => {
    // Regression: after a page reload (or the browser losing its own
    // "is my request still pending" state some other way), a step could
    // still be genuinely running server-side — `run.status` alone only
    // ever reflects the *last completed* step, so a stale "failed" run
    // with an active retry in flight looked exactly like an idle failure
    // with no way to tell otherwise, and no way to Stop it.
    runState = runFixture({ status: "failed", is_advancing: true });
    let cancelled = false;
    server.use(
      http.post(`${ORIGIN}/api/runs/:runId/cancel`, () => {
        cancelled = true;
        return HttpResponse.json({ cancelled: true });
      }),
    );

    const wrapper = mountRunView();

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("Agent is running");
    });
    // The stale "failed" banner/recovery form must not show while a retry
    // is actually in progress, and the Play/Continue button must be
    // disabled while it's genuinely running server-side.
    expect(wrapper.text()).not.toContain("Skip Step");
    expect(wrapper.find('[aria-label="Play current step"]').attributes("disabled")).not.toBeUndefined();

    const stopButton = wrapper.find('[aria-label="Stop"]');
    expect(stopButton.exists()).toBe(true);
    await stopButton.trigger("click");

    await vi.waitFor(() => {
      expect(cancelled).toBe(true);
    });
  });

  it("pre-run: shows the static step sidebar, a centered Preview button, and Init Workflow instead of VCR buttons", async () => {
    const wrapper = mountRunView({ runId: undefined });

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("cd test-product/service/db");
      expect(wrapper.text()).toContain("Say hello!");
    });
    expect(wrapper.findAll("button").find((b) => b.text() === "Preview changes")).toBeTruthy();
    expect(wrapper.findAll("button").find((b) => b.text() === "Init Workflow")).toBeTruthy();
    // No VCR buttons or Reflection button pre-run.
    expect(wrapper.find('[aria-label="Play current step"]').exists()).toBe(false);
    expect(wrapper.find('[aria-label="Reset run"]').exists()).toBe(false);
    expect(wrapper.findAll("button").find((b) => b.text() === "Reflection")).toBeUndefined();
  });

  it("pending run: shows Preview changes (not a blank log pane) alongside VCR controls", async () => {
    runState = runFixture({ status: "pending" });
    const wrapper = mountRunView({ runId: "run-1" });

    await vi.waitFor(() => {
      expect(wrapper.findAll("button").find((b) => b.text() === "Preview changes")).toBeTruthy();
    });
    expect(wrapper.find('[aria-label="Play current step"]').exists()).toBe(true);
    expect(wrapper.findAll("button").find((b) => b.text() === "Init Workflow")).toBeUndefined();
  });

  it("started run: shows the log pane instead of Preview", async () => {
    runState = runFixture({ status: "running", current_step_index: 0 });
    logsState = [
      {
        id: "l1",
        run_id: "run-1",
        step_index: 0,
        channel: "tool",
        level: "info",
        content: "copy started",
        created_at: "2026-09-15T00:00:01.000Z",
      },
    ];
    const wrapper = mountRunView({ runId: "run-1" });

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("copy started");
    });
    expect(wrapper.findAll("button").find((b) => b.text() === "Preview changes")).toBeUndefined();
  });

  it("pending run: Preview changes uses the run-scoped preview-diff endpoint", async () => {
    runState = runFixture({ status: "pending" });
    let hitRunPreview = false;
    server.use(
      http.get(`${ORIGIN}/api/workflow-runs/:runId/preview-diff`, ({ params }) => {
        expect(params.runId).toBe("run-1");
        hitRunPreview = true;
        return HttpResponse.json({
          commit_diff: emptyCommitDiff(),
          entries: [
            {
              workflow_id: "example/hello",
              step_index: 0,
              kind: "copy",
              applied: true,
              files: [{ path: "src/widget.ts", status: "added" }],
            },
          ],
        });
      }),
    );

    const wrapper = mountRunView({ runId: "run-1" });
    await vi.waitFor(() => {
      expect(wrapper.findAll("button").find((b) => b.text() === "Preview changes")).toBeTruthy();
    });
    await wrapper.findAll("button").find((b) => b.text() === "Preview changes")!.trigger("click");
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("widget.ts");
    });
    expect(hitRunPreview).toBe(true);
  });

  it("reset: confirms, then creates a fresh run for the same workflow", async () => {
    let created = false;
    server.use(
      http.post(`${ORIGIN}/api/workflows/:id/runs`, async ({ params, request }) => {
        expect(decodeURIComponent(params.id as string)).toBe("example/hello");
        const body = (await request.json()) as { mode: string };
        expect(body.mode).toBe("run");
        created = true;
        return HttpResponse.json(
          { run: runFixture({ id: "run-2", status: "pending" }) },
          { status: 201 },
        );
      }),
    );

    const wrapper = mountRunView();
    await vi.waitFor(() => {
      expect(wrapper.find('[aria-label="Reset run"]').exists()).toBe(true);
    });

    await wrapper.find('[aria-label="Reset run"]').trigger("click");
    await nextTick();
    // Dialog is teleported to document.body.
    await vi.waitFor(() => {
      expect(document.body.textContent).toContain("Reset this run?");
    });
    const resetBtn = [...document.body.querySelectorAll("button")].find(
      (b) => b.textContent?.trim() === "Reset",
    );
    expect(resetBtn).toBeTruthy();
    resetBtn!.click();

    await vi.waitFor(() => {
      expect(created).toBe(true);
    });
  });

  it("pre-run: Preview changes fetches and shows a file tree, with no skipped-steps note, toggling back to the button", async () => {
    server.use(
      http.post(`${ORIGIN}/api/workflows/:id/preview-diff`, () =>
        HttpResponse.json({
          commit_diff: emptyCommitDiff(),
          entries: [
            {
              workflow_id: "example/hello",
              step_index: 0,
              kind: "copy",
              applied: true,
              files: [
                { path: "src/widget.ts", status: "added" },
                { path: "src/existing.ts", status: "modified" },
              ],
            },
            {
              workflow_id: "example/hello",
              step_index: 1,
              kind: "update",
              applied: false,
              reason: "needs a real run",
            },
          ],
        }),
      ),
    );

    const wrapper = mountRunView({ runId: undefined });
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("Preview changes");
    });

    const previewButton = wrapper
      .findAll("button")
      .find((b) => b.text() === "Preview changes");
    await previewButton!.trigger("click");

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("widget.ts");
    });
    expect(wrapper.text()).toContain("existing.ts");
    // No skipped-steps note or diff content shown alongside the tree.
    expect(wrapper.text()).not.toContain("needs a real run");

    const backButton = wrapper.findAll("button").find((b) => b.text() === "Back");
    expect(backButton).toBeTruthy();
    await backButton!.trigger("click");
    expect(wrapper.findAll("button").find((b) => b.text() === "Preview changes")).toBeTruthy();
  });

  it("pre-run: Preview surfaces mechanical copy failures (area mismatches), not only the file tree", async () => {
    server.use(
      http.post(`${ORIGIN}/api/workflows/:id/preview-diff`, () =>
        HttpResponse.json({
          commit_diff: emptyCommitDiff(),
          entries: [
            {
              workflow_id: "sdk/add-query",
              step_index: 0,
              kind: "copy",
              applied: false,
              reason:
                'Source has workflow area "fake-handler-imports" (FOR sdk/add-query) that target does not have',
            },
            {
              workflow_id: "example/hello",
              step_index: 1,
              kind: "update",
              applied: false,
              reason: "needs a real run",
            },
          ],
        }),
      ),
    );

    const wrapper = mountRunView({ runId: undefined });
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("Preview changes");
    });

    await wrapper.findAll("button").find((b) => b.text() === "Preview changes")!.trigger("click");

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("mechanical failure");
      expect(wrapper.text()).toContain("fake-handler-imports");
    });
    // Expected skips stay quiet.
    expect(wrapper.text()).not.toContain("needs a real run");
  });

  it("pre-run: Init Workflow creates the run", async () => {
    let created: unknown;
    server.use(
      http.post(`${ORIGIN}/api/workflows/:id/runs`, async ({ request }) => {
        created = await request.json();
        return HttpResponse.json({ run: runFixture() }, { status: 201 });
      }),
    );

    const wrapper = mountRunView({ runId: undefined });
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("Init Workflow");
    });

    const initButton = wrapper.findAll("button").find((b) => b.text() === "Init Workflow");
    await initButton!.trigger("click");

    await vi.waitFor(() => {
      expect(created).toBeTruthy();
    });
  });

  it("Reflection navigates to the Checkout compare view for this run's base_commit_hash", async () => {
    runState = runFixture({ status: "running", base_commit_hash: "abc123base" });

    const wrapper = mountRunView();
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("starting");
    });

    const reflectButton = wrapper.findAll("button").find((b) => b.text() === "Reflection");
    expect(reflectButton).toBeTruthy();
    await reflectButton!.trigger("click");

    await vi.waitFor(() => {
      expect(router.currentRoute.value.path).toBe("/checkout");
    });
    expect(router.currentRoute.value.query.compare).toBe("abc123base");
    expect(router.currentRoute.value.query.reflection).toBe("run-1");
  });

  it("has no Reflection button when the run never captured a base_commit_hash", async () => {
    runState = runFixture({ status: "running", base_commit_hash: null });

    const wrapper = mountRunView();
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("starting");
    });

    expect(wrapper.findAll("button").find((b) => b.text() === "Reflection")).toBeUndefined();
  });

  it("mode buttons stay clickable while this run's own advance is in flight, and switching mode doesn't re-fire a call immediately", async () => {
    let advanceCalls = 0;
    let resolveAdvance!: (value: unknown) => void;
    const advancePromise = new Promise((resolve) => {
      resolveAdvance = resolve;
    });
    server.use(
      http.post(`${ORIGIN}/api/runs/:runId/advance`, async () => {
        advanceCalls++;
        await advancePromise;
        return HttpResponse.json({ status: "success", result: {} });
      }),
    );

    const wrapper = mountRunView();
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("starting");
    });

    await wrapper.find('[aria-label="Play current workflow"]').trigger("click");
    await vi.waitFor(() => {
      expect(wrapper.find('[aria-label="Stop"]').attributes("disabled")).toBeFalsy();
    });
    expect(advanceCalls).toBe(1);

    // Switching to "step" mode mid-flight is allowed (not disabled) — it
    // just changes what happens on the *next* continuation, it doesn't
    // re-fire immediately while this run's own advance is still pending.
    const stepButton = wrapper.find('[aria-label="Play current step"]');
    expect(stepButton.attributes("disabled")).toBeFalsy();
    await stepButton.trigger("click");
    expect(advanceCalls).toBe(1);

    resolveAdvance({});
  });

  it("survives navigating away and back: the auto-continue chain keeps advancing across an unmount/remount of RunView", async () => {
    let advanceCount = 0;
    server.use(
      http.post(`${ORIGIN}/api/runs/:runId/advance`, () => {
        advanceCount++;
        if (advanceCount >= 3) return HttpResponse.json({ status: "done" });
        return HttpResponse.json({ status: "success", result: {} });
      }),
    );

    const wrapper = mountRunView();
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("starting");
    });
    await wrapper.find('[aria-label="Play current workflow"]').trigger("click");
    await vi.waitFor(() => {
      expect(advanceCount).toBeGreaterThanOrEqual(1);
    });

    // Simulate navigating away: unmount this instance entirely.
    wrapper.unmount();

    // The chain — owned by the orchestrator singleton, not the unmounted
    // component — keeps going on its own, with nothing mounted at all.
    await vi.waitFor(() => {
      expect(advanceCount).toBe(3);
    });

    // Simulate navigating back: a fresh instance for the same run reflects
    // that it's still the orchestrator's active run, without re-kicking off
    // a redundant advance of its own.
    const wrapper2 = mountRunView();
    await vi.waitFor(() => {
      expect(wrapper2.text()).toContain("starting");
    });
    await new Promise((r) => setTimeout(r, 20));
    expect(advanceCount).toBe(3);
  });

  it("disables the VCR group for a run that isn't the orchestrator's active run", async () => {
    server.use(
      http.get(`${ORIGIN}/api/runs/:runId`, ({ params }) =>
        HttpResponse.json({ run: runFixture({ id: params.runId, status: "running" }) }),
      ),
      http.post(`${ORIGIN}/api/runs/:runId/advance`, async () => {
        await new Promise((r) => setTimeout(r, 50));
        return HttpResponse.json({ status: "success", result: {} });
      }),
    );

    const activeWrapper = mountRunView({ runId: "run-1" });
    await vi.waitFor(() => expect(activeWrapper.text()).toContain("starting"));
    await activeWrapper.find('[aria-label="Play current workflow"]').trigger("click");

    const otherWrapper = mountRunView({ runId: "run-2" });
    await vi.waitFor(() => {
      expect(otherWrapper.find('[aria-label="Play current step"]').attributes("disabled")).not.toBeUndefined();
    });
    expect(otherWrapper.find('[aria-label="Play current workflow"]').attributes("disabled")).not.toBeUndefined();
    expect(otherWrapper.find('[aria-label="Play current plan"]').attributes("disabled")).not.toBeUndefined();
  });

  it("loads an older page of logs when scrolled near the top", async () => {
    logsState = [
      {
        id: "old",
        run_id: "run-1",
        step_index: 0,
        channel: "tool",
        level: "info",
        content: "oldest line",
        created_at: "2026-09-15T00:00:00.000Z",
      },
      {
        id: "mid",
        run_id: "run-1",
        step_index: 0,
        channel: "tool",
        level: "info",
        content: "middle line",
        created_at: "2026-09-15T00:00:01.000Z",
      },
      {
        id: "new",
        run_id: "run-1",
        step_index: 0,
        channel: "tool",
        level: "info",
        content: "newest line",
        created_at: "2026-09-15T00:00:02.000Z",
      },
    ];
    server.use(
      http.get(`${ORIGIN}/api/runs/:runId/logs`, ({ request }) => {
        const url = new URL(request.url);
        const before = url.searchParams.get("before");
        const since = url.searchParams.get("since");
        // Force a 2-row page so three fixtures need a second fetch.
        const limit = 2;
        type LogRow = { id: string; created_at: string };
        let rows = [...(logsState as LogRow[])];
        if (since) rows = rows.filter((l) => l.created_at > since);
        if (before) rows = rows.filter((l) => l.created_at < before);
        rows.sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0));
        const page = rows.slice(0, limit);
        return HttpResponse.json({ logs: page, has_more: rows.length > limit });
      }),
    );

    const wrapper = mountRunView();
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("newest line");
      expect(wrapper.text()).toContain("middle line");
    });
    expect(wrapper.text()).not.toContain("oldest line");

    const el = wrapper.find(".run-view__logs").element as HTMLElement;
    Object.defineProperty(el, "scrollHeight", { value: 1000, configurable: true, writable: true });
    Object.defineProperty(el, "clientHeight", { value: 200, configurable: true });
    Object.defineProperty(el, "scrollTop", { value: 10, writable: true, configurable: true });
    el.dispatchEvent(new Event("scroll"));

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("oldest line");
    });
  });

  it("jumps to an unloaded step and pages older and newer logs from there", async () => {
    const requests: string[] = [];
    stepsState = [
      { index: 0, kind: "cd", label: "first step" },
      { index: 5, kind: "prompt", label: "fifth step" },
    ];
    server.use(
      http.get(`${ORIGIN}/api/runs/:runId/logs`, ({ request }) => {
        const url = new URL(request.url);
        requests.push(url.search);
        const step = url.searchParams.get("step_index");
        const before = url.searchParams.get("before");
        const since = url.searchParams.get("since");
        const contiguous = url.searchParams.get("contiguous");
        if (step === "5") {
          return HttpResponse.json({
            logs: [
              {
                id: "s5",
                run_id: "run-1",
                step_index: 5,
                channel: "tool",
                level: "info",
                content: "fifth step line",
                created_at: "2026-09-15T00:00:05.000Z",
              },
            ],
            has_more: true,
            has_more_newer: true,
          });
        }
        if (before) {
          return HttpResponse.json({
            logs: [
              {
                id: "older",
                run_id: "run-1",
                step_index: 4,
                channel: "tool",
                level: "info",
                content: "older than the jump",
                created_at: "2026-09-15T00:00:04.000Z",
              },
            ],
            has_more: false,
            has_more_newer: false,
          });
        }
        if (since && contiguous === "true") {
          return HttpResponse.json({
            logs: [
              {
                id: "newer",
                run_id: "run-1",
                step_index: 6,
                channel: "tool",
                level: "info",
                content: "newer than the jump",
                created_at: "2026-09-15T00:00:06.000Z",
              },
            ],
            has_more: false,
            has_more_newer: false,
          });
        }
        return HttpResponse.json({
          logs: [
            {
              id: "tip",
              run_id: "run-1",
              step_index: 0,
              channel: "tool",
              level: "info",
              content: "live tip",
              created_at: "2026-09-15T00:00:09.000Z",
            },
          ],
          has_more: true,
          has_more_newer: false,
        });
      }),
    );

    const wrapper = mountRunView();
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("live tip");
    });
    expect(wrapper.text()).not.toContain("fifth step line");

    const fifth = wrapper.findAll(".run-view__sidebar-step").find((el) => el.text().includes("fifth step"));
    expect(fifth).toBeTruthy();
    await fifth!.trigger("click");

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("fifth step line");
    });
    expect(requests.some((q) => q.includes("step_index=5"))).toBe(true);

    const el = wrapper.find(".run-view__logs").element as HTMLElement;
    Object.defineProperty(el, "scrollHeight", { value: 1000, configurable: true, writable: true });
    Object.defineProperty(el, "clientHeight", { value: 200, configurable: true });
    Object.defineProperty(el, "scrollTop", { value: 10, writable: true, configurable: true });
    el.dispatchEvent(new Event("scroll"));
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("older than the jump");
    });

    Object.defineProperty(el, "scrollTop", { value: 900, writable: true, configurable: true });
    el.dispatchEvent(new Event("scroll"));
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("newer than the jump");
    });
    expect(requests.some((q) => q.includes("contiguous=true"))).toBe(true);
  });
});
