import { describe, it, expect, beforeEach, vi } from "vitest";
import { stubGlobals } from "@saflib/vue/testing";
import { setupMockServer } from "@saflib/sdk/testing/mock";
import { http, HttpResponse } from "msw";
import PlansPage from "./PlansPage.vue";
import { mountTestApp } from "../test-app.ts";
import { router } from "./test_router.ts";

const ORIGIN = "http://localhost:3000";

const workflowsResponse = {
  workflows: [
    {
      id: "drizzle/add-query",
      description: "Add a new query to a database.",
      source: "code",
      inputSchema: {
        type: "object",
        properties: { path: { type: "string" } },
        required: ["path"],
      },
    },
  ],
};

const filesResponse = {
  files: [
    {
      path: "test-product/plans/2026-09-15-test-this-thing/test-this-thing.yaml",
      blob_hash: "a",
    },
    {
      path: "test-product/plans/2026-09-16-todo-app/phase-1-backend-schema.yaml",
      blob_hash: "b",
    },
    { path: "test-product/plans/2026-09-16-todo-app/todo-app.spec.md", blob_hash: "c" },
    // A stray file directly under plans/, not in its own dated folder.
    { path: "test-product/plans/add-list-users-query.yaml", blob_hash: "d" },
  ],
};

function runFixture(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "run-1",
    workflow_source: "code",
    workflow_ref: "test-product/plans/2026-09-16-todo-app/phase-1-backend-schema.yaml",
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

// jsdom has no EventSource; RunView's `useRunEvents` opens one once a run exists.
class EventSourceStub {
  addEventListener() {}
  removeEventListener() {}
  close() {}
}

let runsState: unknown[] = [];
/** Keyed by run id — RunView fetches one run's own detail/logs/steps once it's shown inline. */
let runsById: Record<string, unknown> = {};

const handlers = [
  http.get(`${ORIGIN}/api/workflows`, () => HttpResponse.json(workflowsResponse)),
  http.get(`${ORIGIN}/api/repo/files`, () => HttpResponse.json(filesResponse)),
  http.get(`${ORIGIN}/api/repo/file`, ({ request }) => {
    const path = new URL(request.url).searchParams.get("path");
    return HttpResponse.json({ path, content: `# Spec\n\ncontent for ${path}` });
  }),
  http.get(`${ORIGIN}/api/workflows/:id/runs`, () => HttpResponse.json({ runs: runsState })),
  http.get(`${ORIGIN}/api/runs/:runId`, ({ params }) =>
    HttpResponse.json({ run: runsById[params.runId as string] ?? runFixture() }),
  ),
  http.get(`${ORIGIN}/api/runs/:runId/logs`, () => HttpResponse.json({ logs: [] })),
  http.get(`${ORIGIN}/api/runs/:runId/steps`, () => HttpResponse.json({ steps: [] })),
];

describe("PlansPage", () => {
  stubGlobals();
  const server = setupMockServer(handlers);

  beforeEach(() => {
    runsState = [];
    runsById = {};
    vi.stubGlobal("EventSource", EventSourceStub);
  });

  it("lists plan folders newest-first, with no file selected by default", async () => {
    await router.push({ path: "/plans" });
    const wrapper = mountTestApp(PlansPage);

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("todo-app");
      expect(wrapper.text()).toContain("test-this-thing");
    });
    const groupNames = wrapper.findAll(".plans-nav__group-name").map((el) => el.text());
    expect(groupNames.indexOf("todo-app")).toBeLessThan(groupNames.indexOf("test-this-thing"));
    expect(wrapper.text()).toContain("Select a file on the left");

    // The stray top-level file is still listed, under its own group.
    expect(wrapper.text()).toContain("add-list-users-query.yaml");
  });

  it("renders a .md file's content as markdown", async () => {
    await router.push({ path: "/plans/2026-09-16-todo-app/todo-app.spec.md" });
    const wrapper = mountTestApp(PlansPage);

    await vi.waitFor(() => {
      expect(wrapper.find(".plan-file-content__markdown h1").text()).toBe("Spec");
    });
    expect(wrapper.text()).toContain(
      "content for test-product/plans/2026-09-16-todo-app/todo-app.spec.md",
    );
  });

  it("renders an unrecognized extension as plain text, not markdown", async () => {
    await router.push({ path: "/plans/2026-09-16-todo-app/notes.txt" });
    const wrapper = mountTestApp(PlansPage);

    await vi.waitFor(() => {
      expect(wrapper.find("pre").exists()).toBe(true);
    });
    expect(wrapper.find(".plan-file-content__markdown").exists()).toBe(false);
    expect(wrapper.find("pre").text()).toContain("notes.txt");
  });

  it("a .yaml file with no runs offers to start the workflow, then shows it inline once created — no navigation needed", async () => {
    server.use(
      http.post(`${ORIGIN}/api/workflows/:id/runs`, ({ params }) => {
        expect(decodeURIComponent(params.id as string)).toBe(
          "test-product/plans/2026-09-16-todo-app/phase-1-backend-schema.yaml",
        );
        runsState = [runFixture()];
        runsById["run-1"] = runFixture();
        return HttpResponse.json({ run: runFixture() }, { status: 201 });
      }),
    );

    await router.push({ path: "/plans/2026-09-16-todo-app/phase-1-backend-schema.yaml" });
    const wrapper = mountTestApp(PlansPage);

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("hasn't been run yet");
    });
    const startButton = wrapper.findAll("button").find((b) => b.text() === "Start workflow");
    expect(startButton).toBeTruthy();
    await startButton!.trigger("click");

    // No route change at all — creating the run just makes it show up
    // inline via the same workflow-runs query, still on the same URL.
    await vi.waitFor(() => {
      expect(wrapper.text()).not.toContain("hasn't been run yet");
      expect(wrapper.findAll("button").find((b) => b.text() === "Advance")).toBeTruthy();
    });
    expect(router.currentRoute.value.path).toBe(
      "/plans/2026-09-16-todo-app/phase-1-backend-schema.yaml",
    );
  });

  it("a .yaml file with existing runs shows the most recent one inline, no click needed", async () => {
    runsState = [
      { ...runFixture({ id: "run-2", status: "done" }), created_at: "2026-09-16T00:00:00.000Z" },
      runFixture(),
    ];
    runsById["run-2"] = runFixture({ id: "run-2", status: "done" });

    await router.push({ path: "/plans/2026-09-16-todo-app/phase-1-backend-schema.yaml" });
    const wrapper = mountTestApp(PlansPage);

    await vi.waitFor(() => {
      expect(wrapper.find(".v-chip").text()).toBe("done");
    });
    expect(wrapper.text()).not.toContain("hasn't been run yet");
    // The most recent run (run-2, "done") is shown, not the older run-1.
    expect(wrapper.text()).not.toContain("Open run");
  });

  it("arriving with ?workflow=&cwd= switches to the Save-as-plan form", async () => {
    await router.push({
      path: "/plans",
      query: { workflow: "drizzle/add-query", cwd: "test-product/service/db" },
    });
    const wrapper = mountTestApp(PlansPage);

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("Save as plan");
    });
    expect(wrapper.text()).toContain("test-product/service/db");
    expect(wrapper.text()).toContain("drizzle/add-query");
  });

  it("saving a plan navigates to the newly created plan file", async () => {
    server.use(
      http.post(`${ORIGIN}/api/plans`, async () =>
        HttpResponse.json(
          {
            plan: {
              folder: "2026-09-15-my-plan",
              name: "my-plan",
              files: [
                { name: "my-plan.yaml", path: "test-product/plans/2026-09-15-my-plan/my-plan.yaml" },
              ],
            },
          },
          { status: 201 },
        ),
      ),
    );
    await router.push({
      path: "/plans",
      query: { workflow: "drizzle/add-query", cwd: "test-product/service/db" },
    });
    const wrapper = mountTestApp(PlansPage);

    let planNameField;
    await vi.waitFor(() => {
      planNameField = wrapper.findAll(".v-text-field").find((el) => el.text().includes("Plan name"));
      expect(planNameField).toBeTruthy();
    });
    await planNameField!.find("input").setValue("my-plan");

    const saveButton = wrapper.findAll("button").find((b) => b.text().includes("Save plan"));
    await saveButton!.trigger("click");

    await vi.waitFor(() => {
      expect(router.currentRoute.value.path).toBe("/plans/2026-09-15-my-plan/my-plan.yaml");
    });
  });
});
