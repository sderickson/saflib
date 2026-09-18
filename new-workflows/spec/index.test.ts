import { describe, it, expect } from "vitest";
import * as exports from "@saflib/new-workflows-spec";
import type {
  WorkflowConfigBody,
  WorkflowRun,
  WorkflowSummary,
  StepResult,
} from "@saflib/new-workflows-spec";

describe("new-workflows-spec", () => {
  it("should be defined", () => {
    expect(exports).toBeDefined();
  });

  it("types a config-defined workflow body", () => {
    const body: WorkflowConfigBody = {
      name: "Add a demo feature flag",
      steps: [
        { kind: "prompt", prompt: "Review the plan before continuing." },
        {
          kind: "command",
          command: "npm",
          args: ["run", "typecheck"],
          ignoreError: false,
          forceInScript: false,
        },
        { kind: "call-workflow", workflowId: "example/hello", input: { name: "example-thing" } },
      ],
    };
    expect(body.steps).toHaveLength(3);
  });

  it("types a workflow summary and run", () => {
    const summary: WorkflowSummary = {
      id: "example/hello",
      description: "Copies a template file, prompts about it, and runs a command.",
      source: "code",
    };
    const run: WorkflowRun = {
      id: "run-1",
      workflow_source: "code",
      workflow_ref: summary.id,
      input: { name: "example-thing" },
      mode: "print",
      skip_todos: false,
      status: "pending",
      current_step_index: 0,
      cwd: "/tmp",
      agent_config: null,
      parent_run_id: null,
      parent_step_index: null,
      created_at: "2026-09-13T00:00:00.000Z",
      updated_at: "2026-09-13T00:00:00.000Z",
      is_advancing: false,
      was_cancelled: false,
    };
    expect(run.workflow_ref).toBe(summary.id);
  });

  it("types every StepResult variant", () => {
    const results: StepResult[] = [
      { status: "success" },
      { status: "error", message: "boom" },
      { status: "awaiting_prompt", prompt: "do something" },
      { status: "awaiting_user", message: "run the migration" },
      { status: "done" },
    ];
    expect(results).toHaveLength(5);
  });
});
