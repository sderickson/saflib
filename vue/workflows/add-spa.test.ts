import { appendCommaSeparatedEnvValue } from "./shared.ts";
import { AddSpaWorkflowDefinition } from "./add-spa.ts";
import { runWorkflow } from "@saflib/workflows";
import { describe, expect, it } from "vitest";

describe("add-spa", () => {
  it("should successfully dry run", async () => {
    const result = await runWorkflow({
      definition: AddSpaWorkflowDefinition,
      runMode: "checklist",
    });
    expect(result.output?.checklist).toBeDefined();
  });
});

describe("appendCommaSeparatedEnvValue", () => {
  it("appends a subdomain to CLIENT_SUBDOMAINS", () => {
    const before = [
      "DOMAIN=docker.localhost",
      "CLIENT_SUBDOMAINS=,auth,app,admin,account",
      "SERVICE_SUBDOMAINS=base",
    ].join("\n");
    expect(appendCommaSeparatedEnvValue(before, "CLIENT_SUBDOMAINS", "demo"))
      .toBe(
        [
          "DOMAIN=docker.localhost",
          "CLIENT_SUBDOMAINS=,auth,app,admin,account,demo",
          "SERVICE_SUBDOMAINS=base",
        ].join("\n"),
      );
  });

  it("is idempotent when the value is already present", () => {
    const content = "CLIENT_SUBDOMAINS=,auth,app,demo\n";
    expect(
      appendCommaSeparatedEnvValue(content, "CLIENT_SUBDOMAINS", "demo"),
    ).toBe(content);
  });

  it("keeps accumulating across multiple adds", () => {
    let content = "CLIENT_SUBDOMAINS=,auth,app\n";
    content = appendCommaSeparatedEnvValue(content, "CLIENT_SUBDOMAINS", "demo");
    content = appendCommaSeparatedEnvValue(content, "CLIENT_SUBDOMAINS", "foo");
    expect(content).toBe("CLIENT_SUBDOMAINS=,auth,app,demo,foo\n");
  });
});
