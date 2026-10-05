import { describe, it, expect } from "vitest";
import { describeWorkflowSteps } from "./describe-steps.ts";
import { validateWorkflowConfigBody } from "./config/validate.ts";
import { compileConfigWorkflow } from "./config/compile.ts";
import { defineWorkflow } from "./engine.ts";
import { HelloWorkflowDefinition } from "./example-workflows/hello-workflow.ts";

describe("describeWorkflowSteps", () => {
  it("labels config-defined steps from their rendered input", () => {
    const { result: body } = validateWorkflowConfigBody({
      name: "test",
      steps: [
        { kind: "cd", path: "test-product/service/db" },
        { kind: "prompt", prompt: "Say hello!" },
        { kind: "command", command: "npm", args: ["--version"] },
      ],
    });
    const definition = compileConfigWorkflow("test/plan", body!, {});

    expect(describeWorkflowSteps(definition)).toEqual([
      { index: 0, kind: "cd", label: "cd test-product/service/db", params: { path: "test-product/service/db" } },
      { index: 1, kind: "prompt", label: "Say hello!", params: { prompt: "Say hello!" } },
      { index: 2, kind: "command", label: "npm --version", params: { command: "npm", args: "--version" } },
    ]);
  });

  it("labels a call-workflow step with just the target id, and its targetInput as params", () => {
    const { result: body } = validateWorkflowConfigBody({
      name: "test",
      steps: [
        {
          kind: "call-workflow",
          workflowId: "example/hello",
          input: { path: "./schemas/todo.ts" },
        },
      ],
    });
    const definition = compileConfigWorkflow("test/plan", body!, {
      "example/hello": HelloWorkflowDefinition,
    });

    expect(describeWorkflowSteps(definition)).toEqual([
      {
        index: 0,
        kind: "call-workflow",
        label: "example/hello",
        params: { path: "./schemas/todo.ts" },
      },
    ]);
  });

  it("falls back to the bare kind when a step's input throws against an empty context", () => {
    const definition = defineWorkflow({
      id: "test/throws",
      description: "test",
      context: ({ input }) => input as Record<string, unknown>,
      steps: [
        {
          kind: "custom",
          input: (arg) => {
            const context = arg.context as { name: string };
            return { value: context.name.toUpperCase() };
          },
          run: async () => ({ status: "success" }),
        },
      ],
    });

    expect(describeWorkflowSteps(definition)).toEqual([
      { index: 0, kind: "custom", label: undefined, params: undefined },
    ]);
  });
});
