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
  it("shows a short entry inline with no expand affordance", () => {
    const wrapper = mountLogEntry(logFixture({ content: "Running command: npm --version" }));
    expect(wrapper.text()).toContain("Running command: npm --version");
    expect(wrapper.find(".log-entry__toggle").exists()).toBe(false);
  });

  it("strips the ---------- LABEL ---------- header into a badge", () => {
    const wrapper = mountLogEntry(
      logFixture({
        channel: "agent",
        content: "---------- AGENT ----------\nsome text the agent said",
      }),
    );
    expect(wrapper.text()).toContain("AGENT");
    expect(wrapper.text()).toContain("some text the agent said");
  });

  it("shows up to 4 lines by default, and reveals the rest on click", async () => {
    const fullBody = "line one\nline two\nline three\nline four\nline five\nline six";
    const wrapper = mountLogEntry(logFixture({ channel: "terminal", content: fullBody }));

    expect(wrapper.text()).toContain("line one");
    expect(wrapper.text()).toContain("line four");
    expect(wrapper.text()).not.toContain("line five");
    expect(wrapper.find(".log-entry__toggle").text()).toContain("2 more line");

    await wrapper.find(".log-entry__toggle").trigger("click");

    expect(wrapper.text()).toContain("line five");
    expect(wrapper.text()).toContain("line six");
    expect(wrapper.find(".log-entry__toggle").text()).toBe("Show less");

    await wrapper.find(".log-entry__toggle").trigger("click");
    expect(wrapper.text()).not.toContain("line five");
  });

  it("applies an error class for error-level entries", () => {
    const wrapper = mountLogEntry(logFixture({ level: "error", content: "boom" }));
    expect(wrapper.find(".log-entry--error").exists()).toBe(true);
  });

  it("renders agent-channel content as markdown, not a raw text dump", () => {
    const wrapper = mountLogEntry(
      logFixture({
        channel: "agent",
        content: "---------- AGENT ----------\n# Heading\n\nSome **bold** text and a [link](https://example.com).",
      }),
    );
    expect(wrapper.find("h1").text()).toBe("Heading");
    expect(wrapper.find("strong").text()).toBe("bold");
    const link = wrapper.find("a");
    expect(link.attributes("href")).toBe("https://example.com");
    // No line-truncation affordance for markdown entries — they render in full.
    expect(wrapper.find(".log-entry__toggle").exists()).toBe(false);
  });

  it("renders agent-input (prompt) content as markdown too", () => {
    const wrapper = mountLogEntry(
      logFixture({ channel: "agent-input", content: "Please update:\n\n- `a.ts`\n- `b.ts`" }),
    );
    expect(wrapper.findAll("li")).toHaveLength(2);
    expect(wrapper.find("code").text()).toBe("a.ts");
  });

  it("does not render tool/terminal content as markdown (plain text, unaffected by markdown syntax)", () => {
    const wrapper = mountLogEntry(logFixture({ channel: "tool", content: "# not a heading" }));
    expect(wrapper.find("h1").exists()).toBe(false);
    expect(wrapper.text()).toContain("# not a heading");
  });
});
