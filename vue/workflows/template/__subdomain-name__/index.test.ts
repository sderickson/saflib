import { describe, it, expect } from "vitest";
import { main } from "template-package-spa";
import { __subdomain_name___strings } from "template-package-spa/strings";

describe("__subdomain-name__", () => {
  it("should export main.ts", () => {
    expect(main).toBeDefined();
  });

  it("should export __subdomain_name___strings", () => {
    expect(__subdomain_name___strings).toBeDefined();
  });
});
