import { describe, expect, it } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { resolveDevSiteDockerfilePath } from "./dockerfile-path.ts";

describe("resolveDevSiteDockerfilePath", () => {
  it("returns the absolute Dockerfile path", () => {
    const packageRoot = mkdtempSync(join(tmpdir(), "dev-site-docker-"));
    const dockerfile = join(packageRoot, "Dockerfile");
    writeFileSync(dockerfile, "FROM scratch\n", "utf8");

    expect(resolveDevSiteDockerfilePath(packageRoot)).toBe(dockerfile);
  });

  it("throws when Dockerfile is missing", () => {
    const packageRoot = mkdtempSync(join(tmpdir(), "dev-site-docker-missing-"));
    expect(() => resolveDevSiteDockerfilePath(packageRoot)).toThrow(
      /Run saf-docker generate first/,
    );
  });
});
