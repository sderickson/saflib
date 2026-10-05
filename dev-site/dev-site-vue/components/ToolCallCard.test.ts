import { describe, it, expect } from "vitest";
import { mountWithPlugins } from "@saflib/vue/testing";
import ToolCallCard from "./ToolCallCard.vue";
import type { WorkflowLogEntry } from "@saflib/new-workflows-spec";

function resultLog(overrides: Partial<WorkflowLogEntry> = {}): WorkflowLogEntry {
  return {
    id: "l2",
    run_id: "run-1",
    step_index: 0,
    channel: "agent",
    level: "info",
    content: JSON.stringify({ kind: "tool_result", tool_use_id: "toolu_1", content: "ok", is_error: false }),
    created_at: "2026-09-15T00:00:00.000Z",
    ...overrides,
  };
}

describe("ToolCallCard", () => {
  it("shows the bash command as the headline and the description below it", () => {
    const wrapper = mountWithPlugins(ToolCallCard, {
      props: {
        name: "Bash",
        input: { command: "npm run typecheck", description: "Check types" },
      },
    });
    expect(wrapper.text()).toContain("$ npm run typecheck");
    expect(wrapper.text()).toContain("Check types");
  });

  it("shows a running indicator before the result arrives", () => {
    const wrapper = mountWithPlugins(ToolCallCard, {
      props: { name: "Bash", input: { command: "npm test" } },
    });
    expect(wrapper.text()).toContain("running…");
  });

  it("previews the first 4 lines of output and expands to the rest", async () => {
    const output = ["a", "b", "c", "d", "e", "f"].join("\n");
    const wrapper = mountWithPlugins(ToolCallCard, {
      props: {
        name: "Bash",
        input: { command: "find . -type f" },
        resultLog: resultLog({
          content: JSON.stringify({ kind: "tool_result", tool_use_id: "toolu_1", content: output, is_error: false }),
        }),
      },
    });

    expect(wrapper.find(".tool-call-card__body").text()).toBe("a\nb\nc\nd");
    expect(wrapper.text()).not.toContain("running…");

    const toggle = wrapper.find(".tool-call-card__toggle");
    expect(toggle.text()).toContain("2 more line");
    await toggle.trigger("click");

    expect(wrapper.find(".tool-call-card__body").text()).toBe(output);
  });

  it("flags an errored result", () => {
    const wrapper = mountWithPlugins(ToolCallCard, {
      props: {
        name: "Bash",
        input: { command: "false" },
        resultLog: resultLog({
          content: JSON.stringify({ kind: "tool_result", tool_use_id: "toolu_1", content: "boom", is_error: true }),
        }),
      },
    });
    expect(wrapper.find(".tool-call-card--error").exists()).toBe(true);
  });

  it("shows an expandable full-input section for non-Bash tools", async () => {
    const wrapper = mountWithPlugins(ToolCallCard, {
      props: { name: "Read", input: { file_path: "/repo/README.md" } },
    });
    expect(wrapper.text()).toContain("Read(");
    expect(wrapper.find(".tool-call-card__toggle").exists()).toBe(true);

    await wrapper.find(".tool-call-card__toggle").trigger("click");
    expect(wrapper.text()).toContain("/repo/README.md");
  });
});
