import { describe, it, expect, beforeEach } from "vitest";
import {
  AGENT_CLI_OPTIONS,
  __resetAgentSettingsForTests,
  getAgentCli,
  setAgentCli,
  useAgentSettings,
} from "./agent-settings.ts";

describe("agent-settings", () => {
  beforeEach(() => {
    __resetAgentSettingsForTests();
  });

  it("defaults to claude-agent", () => {
    expect(getAgentCli()).toBe("claude-agent");
  });

  it("persists the selection and exposes it reactively", () => {
    const { agentCli, agentLabel } = useAgentSettings();
    setAgentCli("cursor-agent");
    expect(getAgentCli()).toBe("cursor-agent");
    expect(agentCli.value).toBe("cursor-agent");
    expect(agentLabel.value).toBe("Cursor");
    expect(localStorage.getItem("dev-site.agent.cli")).toBe("cursor-agent");
  });

  it("lists both production agents", () => {
    expect(AGENT_CLI_OPTIONS.map((o) => o.value)).toEqual([
      "claude-agent",
      "cursor-agent",
    ]);
  });
});
