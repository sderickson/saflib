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

const runFixture = {
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
};

let runsState: unknown[] = [];

const handlers = [
  http.get(`${ORIGIN}/api/workflows`, () => HttpResponse.json(workflowsResponse)),
  http.get(`${ORIGIN}/api/repo/files`, () => HttpResponse.json(filesResponse)),
  http.get(`${ORIGIN}/api/repo/file`, ({ request }) => {
    const path = new URL(request.url).searchParams.get("path");
    return HttpResponse.json({ path, content: `# Spec\n\ncontent for ${path}` });
  }),
  http.get(`${ORIGIN}/api/workflows/:id/runs`, () => HttpResponse.json({ runs: runsState })),
];

describe("PlansPage", () => {
  stubGlobals();
  const server = setupMockServer(handlers);

  beforeEach(() => {
    runsState = [];
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

  it("a .yaml file with no runs offers to start the workflow, then navigates to the new run", async () => {
    server.use(
      http.post(`${ORIGIN}/api/workflows/:id/runs`, ({ params }) => {
        expect(decodeURIComponent(params.id as string)).toBe(
          "test-product/plans/2026-09-16-todo-app/phase-1-backend-schema.yaml",
        );
        return HttpResponse.json({ run: runFixture }, { status: 201 });
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

    await vi.waitFor(() => {
      expect(router.currentRoute.value.path).toBe("/workflows/runs/run-1");
    });
  });

  it("a .yaml file with existing runs shows the most recent one and links to it", async () => {
    runsState = [
      { ...runFixture, id: "run-2", status: "done", created_at: "2026-09-16T00:00:00.000Z" },
      { ...runFixture, id: "run-1" },
    ];

    await router.push({ path: "/plans/2026-09-16-todo-app/phase-1-backend-schema.yaml" });
    const wrapper = mountTestApp(PlansPage);

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("done");
    });
    const openRun = wrapper.findAll("a").find((a) => a.attributes("href") === "/workflows/runs/run-2");
    expect(openRun).toBeTruthy();
    expect(wrapper.text()).not.toContain("hasn't been run yet");
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
