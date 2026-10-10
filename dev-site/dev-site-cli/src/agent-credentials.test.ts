import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { vol } from "memfs";
import path from "node:path";

vi.mock("node:fs", async () => {
  const memfs = await import("memfs");
  return memfs.fs;
});

const { execFileSync, platform } = vi.hoisted(() => ({
  execFileSync: vi.fn(),
  platform: vi.fn<() => string>(() => "darwin"),
}));

vi.mock("node:child_process", () => ({
  execFileSync,
}));

vi.mock("node:os", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:os")>();
  return {
    ...actual,
    default: { ...actual.default, platform },
    platform,
  };
});

import {
  writeClaudeCredentials,
  writeCursorCredentials,
} from "./agent-credentials.ts";

describe("agent-credentials preserve on failure", () => {
  const devDir = "/my-product/dev";

  beforeEach(() => {
    vol.reset();
    vol.mkdirSync(devDir, { recursive: true });
    execFileSync.mockReset();
    platform.mockReturnValue("darwin");
  });

  afterEach(() => {
    vol.reset();
  });

  it("keeps existing Claude credentials when Keychain lookup fails", () => {
    const existing = '{"claudeAiOauth":{"accessToken":"x"}}\n';
    vol.writeFileSync(path.join(devDir, ".claude-credentials.json"), existing);
    execFileSync.mockImplementation(() => {
      throw new Error("keychain denied");
    });

    writeClaudeCredentials(devDir);

    expect(vol.readFileSync(path.join(devDir, ".claude-credentials.json"), "utf8")).toBe(
      existing,
    );
  });

  it("writes empty Claude placeholder only when nothing valid exists", () => {
    execFileSync.mockImplementation(() => {
      throw new Error("keychain denied");
    });

    writeClaudeCredentials(devDir);

    expect(vol.readFileSync(path.join(devDir, ".claude-credentials.json"), "utf8")).toBe(
      "{}\n",
    );
  });

  it("keeps existing Cursor auth when Keychain and auth.json are missing", () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const payload = Buffer.from(JSON.stringify({ exp: futureExp })).toString(
      "base64url",
    );
    const tok = `h.${payload}.s`;
    const existing = `${JSON.stringify({
      accessToken: tok,
      refreshToken: tok,
    })}\n`;
    vol.writeFileSync(path.join(devDir, ".cursor-auth.json"), existing);
    execFileSync.mockReturnValue("");

    writeCursorCredentials(devDir);

    expect(vol.readFileSync(path.join(devDir, ".cursor-auth.json"), "utf8")).toBe(
      existing,
    );
  });
});
