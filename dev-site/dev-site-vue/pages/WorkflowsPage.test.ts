import { describe, it, expect, beforeEach, vi } from "vitest";
import { stubGlobals } from "@saflib/vue/testing";
import { setupMockServer } from "@saflib/sdk/testing/mock";
import { http, HttpResponse } from "msw";
import WorkflowsPage from "./WorkflowsPage.vue";
import { mountTestApp } from "../test-app.ts";
import { router } from "./test_router.ts";

const ORIGIN = "http://localhost:3000";

const workflowsResponse = {
  workflows: [
    {
      id: "example/hello",
      description: "Copies a template file, prompts about it, and runs a command.",
      source: "code",
      inputSchema: {
        type: "object",
        properties: { name: { type: "string" } },
        required: ["name"],
      },
    },
    {
      id: "drizzle/add-query",
      description: "Add a new query to a database.",
      source: "code",
      inputSchema: {
        type: "object",
        properties: {
          path: { type: "string" },
          prompt: { type: "string" },
        },
        required: ["path"],
      },
    },
  ],
};

const emptyPlansResponse = { plans: [] };
const onePlanResponse = {
  plans: [
    {
      folder: "2026-09-15-add-list-users-query",
      name: "add-list-users-query",
      files: [
        {
          name: "add-list-users-query.yaml",
          path: "test-product/plans/2026-09-15-add-list-users-query/add-list-users-query.yaml",
        },
      ],
    },
  ],
};

const runFixture = {
  id: "run-1",
  workflow_source: "code",
  workflow_ref: "test-product/plans/2026-09-15-add-list-users-query/add-list-users-query.yaml",
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
};

// A single, always-registered `/api/plans` handler reading mutable state,
// rather than `server.use()` overrides — this msw/vitest-mocker combo
// doesn't apply a runtime override for a method+path already covered by a
// base handler (only for genuinely new ones, like the POST routes below).
let plansState: typeof emptyPlansResponse | typeof onePlanResponse = emptyPlansResponse;

const handlers = [
  http.get(`${ORIGIN}/api/workflows`, () => HttpResponse.json(workflowsResponse)),
  http.get(`${ORIGIN}/api/plans`, () => HttpResponse.json(plansState)),
  http.get(`${ORIGIN}/api/workflows/:id/runs`, () => HttpResponse.json({ runs: [] })),
];

describe("WorkflowsPage", () => {
  stubGlobals();
  const server = setupMockServer(handlers);

  beforeEach(() => {
    plansState = emptyPlansResponse;
  });

  it("renders without error once the workflow list loads, with no Start a run form", async () => {
    await router.push({ path: "/workflows" });
    const wrapper = mountTestApp(WorkflowsPage);

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("Workflows");
      expect(wrapper.text()).toContain("Plans");
    });
    expect(wrapper.text()).not.toContain("Start a run");
    expect(wrapper.find(".v-select").exists()).toBe(false);
  });

  it("shows a message when there are no saved plans", async () => {
    await router.push({ path: "/workflows" });
    const wrapper = mountTestApp(WorkflowsPage);

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("No saved plans yet");
    });
  });

  it("arriving with ?workflow=&cwd= switches to Save as plan", async () => {
    await router.push({
      path: "/workflows",
      query: { workflow: "drizzle/add-query", cwd: "test-product/service/db" },
    });
    const wrapper = mountTestApp(WorkflowsPage);

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("Save as plan");
    });
    expect(wrapper.text()).toContain("test-product/service/db");
    expect(wrapper.text()).toContain("drizzle/add-query");
  });

  it("Save plan posts a cd + call-workflow config to POST /api/plans", async () => {
    let createdBody: unknown;
    server.use(
      http.post(`${ORIGIN}/api/plans`, async ({ request }) => {
        createdBody = await request.json();
        return HttpResponse.json(
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
        );
      }),
    );
    await router.push({
      path: "/workflows",
      query: { workflow: "drizzle/add-query", cwd: "test-product/service/db" },
    });
    const wrapper = mountTestApp(WorkflowsPage);

    let planNameField;
    await vi.waitFor(() => {
      planNameField = wrapper.findAll(".v-text-field").find((el) => el.text().includes("Plan name"));
      expect(planNameField).toBeTruthy();
    });
    await planNameField!.find("input").setValue("add-list-users-query");

    const saveButton = wrapper.findAll("button").find((b) => b.text().includes("Save plan"));
    expect(saveButton).toBeTruthy();
    await saveButton!.trigger("click");

    await vi.waitFor(() => {
      expect(createdBody).toBeDefined();
    });
    expect(createdBody).toMatchObject({
      name: "add-list-users-query",
      body: {
        name: "add-list-users-query",
        steps: [
          { kind: "cd", path: "test-product/service/db" },
          { kind: "call-workflow", workflowId: "drizzle/add-query" },
        ],
      },
    });
  });

  it("lists a saved plan and navigates to a new run started from it", async () => {
    plansState = onePlanResponse;
    server.use(
      http.post(`${ORIGIN}/api/workflows/:id/runs`, ({ params }) => {
        expect(decodeURIComponent(params.id as string)).toBe(
          "test-product/plans/2026-09-15-add-list-users-query/add-list-users-query.yaml",
        );
        return HttpResponse.json({ run: runFixture }, { status: 201 });
      }),
    );

    await router.push({ path: "/workflows" });
    const wrapper = mountTestApp(WorkflowsPage);

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("add-list-users-query");
    });
    const newRunButton = wrapper.findAll("button").find((b) => b.text().includes("New run"));
    expect(newRunButton).toBeTruthy();
    await newRunButton!.trigger("click");

    await vi.waitFor(() => {
      expect(router.currentRoute.value.path).toBe("/workflows/runs/run-1");
    });
  });
});
