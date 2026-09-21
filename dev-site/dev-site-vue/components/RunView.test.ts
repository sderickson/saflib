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
  http.get(`${ORIGIN}/api/runs/:runId/logs`, () => HttpResponse.json({ logs: logsState })),
  http.get(`${ORIGIN}/api/runs/:runId/steps`, () => HttpResponse.json({ steps: stepsState })),
];

function mountRunView() {
  return mountTestApp(RunView, { props: { runId: "run-1" } });
}

describe("RunView", () => {
  stubGlobals();
  const server = setupMockServer(handlers);
  // Vuetify's `v-dialog` teleports to the real `document.body`, which
  // otherwise survives across tests (and files, under this suite's
  // `isolate: false`) since nothing else unmounts a previous test's wrapper.
  enableAutoUnmount(afterEach);

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

  it("Reflection navigates to the Checkout compare view for this run's base_commit_hash", async () => {
    runState = runFixture({ base_commit_hash: "abc123base" });

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
    runState = runFixture({ base_commit_hash: null });

    const wrapper = mountRunView();
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("starting");
    });

    expect(wrapper.findAll("button").find((b) => b.text() === "Reflection")).toBeUndefined();
  });
});
