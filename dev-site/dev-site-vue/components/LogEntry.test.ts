import { describe, it, expect } from "vitest";
import { mountWithPlugins } from "@saflib/vue/testing";
import LogEntry from "./LogEntry.vue";
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

function mountLogEntry(log: WorkflowLogEntry) {
  return mountWithPlugins(LogEntry, { props: { log } });
}

describe("LogEntry", () => {
  it("shows a short entry inline without needing to expand", () => {
    const wrapper = mountLogEntry(logFixture({ content: "Running command: npm --version" }));
    expect(wrapper.text()).toContain("Running command: npm --version");
    expect(wrapper.find(".log-entry__full").exists()).toBe(false);
  });

  it("strips the ---------- LABEL ---------- header into a badge and summarizes the body", () => {
    const wrapper = mountLogEntry(
      logFixture({
        channel: "agent",
        content:
          "---------- AGENT ----------\nTool: Bash({\"command\":\"npm run typecheck\",\"description\":\"Check types\"})",
      }),
    );
    expect(wrapper.text()).toContain("AGENT");
    expect(wrapper.text()).toContain("Tool: Bash");
    expect(wrapper.find(".log-entry__full").exists()).toBe(false);
  });

  it("collapses a multi-line body to its first line, and expands on click", async () => {
    const fullBody = "line one\nline two\nline three";
    const wrapper = mountLogEntry(
      logFixture({ channel: "terminal", content: fullBody }),
    );

    expect(wrapper.text()).toContain("line one");
    expect(wrapper.text()).not.toContain("line two");
    expect(wrapper.find(".log-entry__full").exists()).toBe(false);

    await wrapper.find(".log-entry__head").trigger("click");

    expect(wrapper.find(".log-entry__full").exists()).toBe(true);
    expect(wrapper.find(".log-entry__full").text()).toBe(fullBody);

    await wrapper.find(".log-entry__head").trigger("click");
    expect(wrapper.find(".log-entry__full").exists()).toBe(false);
  });

  it("applies an error class for error-level entries", () => {
    const wrapper = mountLogEntry(logFixture({ level: "error", content: "boom" }));
    expect(wrapper.find(".log-error").exists()).toBe(true);
  });
});
