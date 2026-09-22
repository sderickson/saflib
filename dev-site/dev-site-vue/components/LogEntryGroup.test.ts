import { describe, it, expect } from "vitest";
import { mountWithPlugins } from "@saflib/vue/testing";
import LogEntryGroup from "./LogEntryGroup.vue";
import type { WorkflowLogEntry } from "@saflib/new-workflows-spec";

function logFixture(overrides: Partial<WorkflowLogEntry> = {}): WorkflowLogEntry {
  return {
    id: "l1",
    run_id: "run-1",
    step_index: 0,
    channel: "tool",
    level: "info",
    content: "Running command: npm --version",
    created_at: "2026-09-15T00:00:00.000Z",
    ...overrides,
  };
}

describe("LogEntryGroup", () => {
  it("shows one channel badge and every log's content, with no expand affordance under the threshold", () => {
    const logs = [
      logFixture({ id: "a", content: "Running command: npm run typecheck" }),
      logFixture({ id: "b", content: "Successfully ran `npm run typecheck`" }),
    ];
    const wrapper = mountWithPlugins(LogEntryGroup, { props: { logs } });

    expect(wrapper.findAll(".log-entry__channel")).toHaveLength(1);
    expect(wrapper.text()).toContain("[tool]");
    expect(wrapper.find(".log-entry__time").exists()).toBe(true);
    expect(wrapper.text()).toContain("Running command: npm run typecheck");
    expect(wrapper.text()).toContain("Successfully ran `npm run typecheck`");
    expect(wrapper.find(".log-entry__toggle").exists()).toBe(false);
  });

  it("collapses past 4 entries and reveals the rest on click", async () => {
    const logs = Array.from({ length: 6 }, (_, i) => logFixture({ id: `l${i}`, content: `line ${i}` }));
    const wrapper = mountWithPlugins(LogEntryGroup, { props: { logs } });

    expect(wrapper.text()).toContain("line 3");
    expect(wrapper.text()).not.toContain("line 4");
    expect(wrapper.find(".log-entry__toggle").text()).toContain("2 more line");

    await wrapper.find(".log-entry__toggle").trigger("click");

    expect(wrapper.text()).toContain("line 4");
    expect(wrapper.text()).toContain("line 5");
    expect(wrapper.find(".log-entry__toggle").text()).toBe("Show less");
  });

  it("applies an error class when any entry in the group is error-level", () => {
    const logs = [logFixture({ id: "a" }), logFixture({ id: "b", level: "error", content: "boom" })];
    const wrapper = mountWithPlugins(LogEntryGroup, { props: { logs } });

    expect(wrapper.find(".log-entry--error").exists()).toBe(true);
  });
});
