import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { vol } from "memfs";
import { ensureLocalEnvFile } from "./prepare.ts";

vi.mock("node:fs", async () => {
  const memfs = await import("memfs");
  return memfs.fs;
});

describe("ensureLocalEnvFile", () => {
  beforeEach(() => {
    vol.reset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vol.reset();
    vi.restoreAllMocks();
  });

  it("creates an empty .env when missing", () => {
    vol.fromJSON({ "/p/dev/docker-compose.yaml": "" }, "/");
    ensureLocalEnvFile("/p/dev");
    expect(vol.readFileSync("/p/dev/.env", "utf8")).toBe("");
  });

  it("keeps an existing .env", () => {
    vol.fromJSON({ "/p/dev/.env": "KEY=value\n" }, "/");
    ensureLocalEnvFile("/p/dev");
    expect(vol.readFileSync("/p/dev/.env", "utf8")).toBe("KEY=value\n");
  });
});
