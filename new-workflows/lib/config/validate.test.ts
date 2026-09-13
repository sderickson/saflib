import { describe, it, expect } from "vitest";
import { validateWorkflowConfigBody } from "./validate.ts";

describe("validateWorkflowConfigBody", () => {
  it("accepts a valid config", () => {
    const { result, error } = validateWorkflowConfigBody({
      name: "Say hello",
      steps: [
        { kind: "prompt", prompt: "hi" },
        { kind: "command", command: "npm", args: ["--version"] },
      ],
    });
    expect(error).toBeUndefined();
    expect(result?.name).toBe("Say hello");
  });

  it("accepts a call-workflow step", () => {
    const { result, error } = validateWorkflowConfigBody({
      name: "Delegate",
      steps: [{ kind: "call-workflow", workflowId: "example/hello", input: { name: "x" } }],
    });
    expect(error).toBeUndefined();
    expect(result).toBeDefined();
  });

  it("rejects an unknown step kind", () => {
    const { result, error } = validateWorkflowConfigBody({
      name: "Bad",
      steps: [{ kind: "copy", templateFiles: {}, targetDir: "." }],
    });
    expect(result).toBeUndefined();
    expect(error).toBeInstanceOf(Error);
  });

  it("rejects a config missing required fields", () => {
    const { result, error } = validateWorkflowConfigBody({ steps: [] });
    expect(result).toBeUndefined();
    expect(error?.message).toContain("Invalid workflow config");
  });

  it("rejects a step missing its own required field", () => {
    const { result, error } = validateWorkflowConfigBody({
      name: "Bad",
      steps: [{ kind: "command" }],
    });
    expect(result).toBeUndefined();
    expect(error).toBeInstanceOf(Error);
  });
});
