import { describe, it, expect } from "vitest";
import { mountWithPlugins } from "@saflib/vue/testing";
import { setupMockServer } from "@saflib/sdk/testing/mock";
import { http, HttpResponse } from "msw";
import PlanNavIcon from "./PlanNavIcon.vue";

const ORIGIN = "http://localhost:3000";

function runFixture(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "run-1",
    workflow_source: "code",
    workflow_ref: "test-product/plans/example/phase-1.yaml",
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
    was_cancelled: false,
    ...overrides,
  };
}

let runsState: unknown[] = [];
const handlers = [
  http.get(`${ORIGIN}/api/workflows/:id/runs`, () => HttpResponse.json({ runs: runsState })),
];

describe("PlanNavIcon", () => {
  setupMockServer(handlers);

  it("shows a fixed doc icon for markdown files, never querying runs", () => {
    const wrapper = mountWithPlugins(PlanNavIcon, {
      props: { filePath: "test-product/plans/example/spec.md", kind: "markdown" },
    });
    expect(wrapper.find(".v-icon").attributes("class")).toContain("mdi-file-document-outline");
  });

  it("shows a fixed generic-file icon for other file kinds", () => {
    const wrapper = mountWithPlugins(PlanNavIcon, {
      props: { filePath: "test-product/plans/example/notes.txt", kind: "text" },
    });
    expect(wrapper.find(".v-icon").attributes("class")).toContain("mdi-file-outline");
  });

  it("shows a neutral play icon for a workflow file that's never been run", async () => {
    runsState = [];
    const wrapper = mountWithPlugins(PlanNavIcon, {
      props: { filePath: "test-product/plans/example/phase-1.yaml", kind: "workflow" },
    });
    await new Promise((r) => setTimeout(r, 10));
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".v-icon").attributes("class")).toContain("mdi-play-circle-outline");
  });

  it("shows a green check for a workflow whose most recent run is done", async () => {
    runsState = [runFixture({ status: "done" })];
    const wrapper = mountWithPlugins(PlanNavIcon, {
      props: { filePath: "test-product/plans/example/phase-1.yaml", kind: "workflow" },
    });
    await new Promise((r) => setTimeout(r, 10));
    await wrapper.vm.$nextTick();
    const icon = wrapper.find(".v-icon");
    expect(icon.attributes("class")).toContain("mdi-check-circle");
    expect(icon.attributes("class")).toContain("text-success");
  });

  it("shows a red x for a workflow whose most recent run failed", async () => {
    runsState = [runFixture({ status: "failed" })];
    const wrapper = mountWithPlugins(PlanNavIcon, {
      props: { filePath: "test-product/plans/example/phase-1.yaml", kind: "workflow" },
    });
    await new Promise((r) => setTimeout(r, 10));
    await wrapper.vm.$nextTick();
    const icon = wrapper.find(".v-icon");
    expect(icon.attributes("class")).toContain("mdi-close-circle");
    expect(icon.attributes("class")).toContain("text-error");
  });

  it("shows a spinner (not the stale status icon) while the run is actively advancing", async () => {
    runsState = [runFixture({ status: "failed", is_advancing: true })];
    const wrapper = mountWithPlugins(PlanNavIcon, {
      props: { filePath: "test-product/plans/example/phase-1.yaml", kind: "workflow" },
    });
    await new Promise((r) => setTimeout(r, 10));
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".v-progress-circular").exists()).toBe(true);
    expect(wrapper.find(".v-icon").exists()).toBe(false);
  });

  it("shows a light-blue pause icon when the run was stopped by the user, not a genuine failure", async () => {
    runsState = [runFixture({ status: "failed", was_cancelled: true })];
    const wrapper = mountWithPlugins(PlanNavIcon, {
      props: { filePath: "test-product/plans/example/phase-1.yaml", kind: "workflow" },
    });
    await new Promise((r) => setTimeout(r, 10));
    await wrapper.vm.$nextTick();
    const icon = wrapper.find(".v-icon");
    expect(icon.attributes("class")).toContain("mdi-pause-circle");
    expect(icon.attributes("class")).toContain("text-light-blue");
  });
});
