import { describe, it, expect } from "vitest";
import {
  buildCommitMessage,
  describeRunSubject,
  firstLine,
  parsePlanFile,
  summarizeAgentTurns,
  type CommitMessageInput,
} from "./commit-message.ts";

const PLAN_REF = "daemon/plans/notes/2026-10-14-results-payments/phase-2-stripe-invoice-items.workflow.yaml";

const root = { id: "Bd0roKh92yfr", workflow_ref: PLAN_REF, input: {}, parent_step_index: null, cwd: "/repo" };
const routeChild = {
  id: "9x2KqL0p",
  workflow_ref: "openapi/route",
  input: { path: "./routes/matter-finalizations/push-to-stripe.yaml" },
  parent_step_index: 6,
};

function message(overrides: Partial<CommitMessageInput>): string {
  return buildCommitMessage({
    chain: [root],
    stepIndex: 0,
    stepCount: 5,
    kind: "command",
    stepInput: {},
    label: "command",
    skipped: false,
    ...overrides,
  });
}

describe("buildCommitMessage", () => {
  it("addresses a nested step by plan, phase, and step numbers, with trailers", () => {
    expect(
      message({
        chain: [root, routeChild],
        stepIndex: 1,
        kind: "update",
        stepInput: { fileId: "route" },
        stepResult: { filePath: "/repo/daemon/service/spec/routes/matter-finalizations/push-to-stripe.yaml" },
        label: "update: route",
        agentSummary: "Agent: claude-agent, resumed session 3f2a9c1d, 4 turns, 38s, $0.06",
      }),
    ).toBe(
      [
        "results-payments 2.7.2 openapi/route(push-to-stripe) update: route",
        "",
        "File: daemon/service/spec/routes/matter-finalizations/push-to-stripe.yaml",
        "Step 2 of 5 in openapi/route (push-to-stripe), called from step 7 of",
        "phase-2-stripe-invoice-items.workflow.yaml.",
        "Agent: claude-agent, resumed session 3f2a9c1d, 4 turns, 38s, $0.06",
        "",
        "Workflow-Plan: daemon/plans/notes/2026-10-14-results-payments",
        "Workflow-Run: Bd0roKh92yfr",
        "Workflow-Step: 2.7.2",
        "Workflow-Source-Run: 9x2KqL0p",
        "Workflow-Source: openapi/route",
      ].join("\n"),
    );
  });

  it("uses a prompt's first line as the subject and its first paragraph as the body", () => {
    const msg = message({
      stepIndex: 5,
      stepCount: 14,
      kind: "prompt",
      stepInput: {
        prompt:
          "Edit **jobs.ts**: add one entry to daemonTriggerMap\nfor fillPacket.\n\nSecond paragraph stays out.",
      },
      label: "Edit **jobs.ts**: add one entry…",
    });
    const [subject, body] = msg.split("\n\n");
    expect(subject).toBe("results-payments 2.6 Edit jobs.ts: add one entry to daemonTriggerMap");
    expect(body).toBe("Edit jobs.ts: add one entry to daemonTriggerMap for fillPacket.");
    expect(msg).not.toContain("Second paragraph");
    expect(msg).toContain("Step 6 of 14 in phase-2-stripe-invoice-items.workflow.yaml.");
    expect(msg).not.toContain("Workflow-Source-Run");
  });

  it("keeps the subject within 72 characters and moves a long command into the body", () => {
    const longCommand = `bash -c ${"x".repeat(120)}`;
    const msg = message({ label: longCommand });
    const [subject, body] = msg.split("\n\n");
    expect(subject.length).toBeLessThanOrEqual(72);
    expect(subject.endsWith("…")).toBe(true);
    expect(body.replace(/\n/g, " ")).toContain(longCommand.slice(0, 40));
  });

  it("labels a code workflow run (no plan file) by its id and input, and marks skips", () => {
    const msg = message({
      chain: [{ id: "r1", workflow_ref: "openapi/schema", input: { name: "matter" }, parent_step_index: null }],
      stepIndex: 2,
      label: "npm run generate",
      skipped: true,
    });
    expect(msg.split("\n")[0]).toBe("openapi/schema(matter) 3 skip npm run generate");
    expect(msg).toContain("Skipped step 3 of 5 in openapi/schema.");
    expect(msg).not.toContain("Workflow-Plan");
    expect(msg).toContain("Workflow-Step: 3");
  });
});

describe("helpers", () => {
  it("parses plan files, and ignores other workflow refs", () => {
    expect(parsePlanFile(PLAN_REF)).toEqual({
      planDir: "daemon/plans/notes/2026-10-14-results-payments",
      planName: "results-payments",
      fileName: "phase-2-stripe-invoice-items.workflow.yaml",
      phase: 2,
    });
    expect(parsePlanFile("openapi/route")).toBeUndefined();
  });

  it("describes a run by its name, else its path's basename", () => {
    expect(describeRunSubject({ name: "org", path: "./x.ts" })).toBe("org");
    expect(describeRunSubject({ path: "./queries/matter-finalization/insert-if-new.ts" })).toBe(
      "insert-if-new",
    );
    expect(describeRunSubject({ path: "./pages/orgs" })).toBe("orgs");
    expect(describeRunSubject({ prompt: "x" })).toBeUndefined();
  });

  it("takes the first non-empty line without markdown markers", () => {
    expect(firstLine("\n## Decide whether **POST /x** needs `auth`\nmore")).toBe(
      "Decide whether POST /x needs auth",
    );
  });

  it("summarizes a step's agent turns", () => {
    const t0 = new Date("2026-10-15T00:00:00Z");
    const turn = {
      cli: "claude-agent",
      session_id: "3f2a9c1d-aaaa",
      resumed_session_id: "3f2a9c1d-aaaa",
      started_at: t0,
      finished_at: new Date(t0.getTime() + 30_000),
      num_turns: 3,
      cost_usd: 0.05,
    };
    expect(summarizeAgentTurns([])).toBeUndefined();
    expect(
      summarizeAgentTurns([turn, { ...turn, num_turns: 1, cost_usd: 0.01, finished_at: new Date(t0.getTime() + 38_000) }]),
    ).toBe("Agent: claude-agent, resumed session 3f2a9c1d, 2 invocations, 4 turns, 68s, $0.06");
  });
});
