import { describe, it, expect, vi, beforeEach } from "vitest";
import { nextTick } from "vue";
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
  http.get(`${ORIGIN}/api/runs/:runId/steps`, () =>
    HttpResponse.json({
      steps: [
        { index: 0, kind: "cd", label: "cd test-product/service/db" },
        { index: 1, kind: "prompt", label: "Say hello!" },
      ],
    }),
  ),
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

    await router.push({ path: "/workflows/runs/run-1" });
    const wrapper = mountTestApp(RunPage);

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("starting");
    });

    const el = wrapper.find(".run-page__logs").element as HTMLElement;
    // jsdom doesn't compute real layout — fake a tall, scrolled-up container.
    Object.defineProperty(el, "scrollHeight", { value: 1000, configurable: true });
    Object.defineProperty(el, "clientHeight", { value: 200, configurable: true });
    Object.defineProperty(el, "scrollTop", { value: 100, writable: true, configurable: true });
    el.dispatchEvent(new Event("scroll"));

    const advanceButton = wrapper.findAll("button").find((b) => b.text() === "Advance");
    await advanceButton!.trigger("click");

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("more output");
    });
    // Would be forced to 1000 (scrollHeight) if the page auto-scrolled.
    expect(el.scrollTop).toBe(100);
  });

  it("shows a step sidebar, highlights the step at the top of the view, and marks the last agent-input sticky", async () => {
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

    await router.push({ path: "/workflows/runs/run-1" });
    const wrapper = mountTestApp(RunPage);

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("cd test-product/service/db");
      expect(wrapper.text()).toContain("Say hello!");
    });

    // Only the most recent agent-input entry is sticky.
    const items = wrapper.findAll(".run-page__log-item");
    const stickyItems = items.filter((i) => i.classes().includes("run-page__log-item--sticky"));
    expect(stickyItems).toHaveLength(1);
    expect(stickyItems[0].text()).toContain("Do the second thing");

    // Fake layout: item 0 (step 0) above the fold, item 1 (step 1) at top of view.
    const itemEls = items.map((i) => i.element as HTMLElement);
    vi.spyOn(itemEls[0], "getBoundingClientRect").mockReturnValue({
      top: -50,
      bottom: -10,
    } as DOMRect);
    vi.spyOn(itemEls[1], "getBoundingClientRect").mockReturnValue({
      top: 0,
      bottom: 40,
    } as DOMRect);
    const el = wrapper.find(".run-page__logs").element as HTMLElement;
    vi.spyOn(el, "getBoundingClientRect").mockReturnValue({ top: 0, bottom: 500 } as DOMRect);
    el.dispatchEvent(new Event("scroll"));
    await nextTick();

    const sidebarSteps = wrapper.findAll(".run-page__sidebar-step");
    expect(sidebarSteps[1].classes()).toContain("run-page__sidebar-step--active");
    expect(sidebarSteps[0].classes()).not.toContain("run-page__sidebar-step--active");
  });
});
