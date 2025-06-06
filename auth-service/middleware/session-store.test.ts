import { createApp } from "../app.ts";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { readFileSync, existsSync, writeFileSync } from "fs";
import { clearStorage } from "./session-store.ts";

vi.mock("fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("fs")>();
  return {
    ...actual,
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
  };
});

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
  clearStorage();
});

describe("Session Store", () => {
  it("should create a new secret if the file doesn't exist", () => {
    expect(vi.mocked(existsSync).mock.calls.length).toBe(0);
    expect(vi.mocked(writeFileSync).mock.calls.length).toBe(0);
    createApp({ callbacks: {} });
    expect(vi.mocked(existsSync).mock.calls.length).toBe(1);
    expect(vi.mocked(writeFileSync).mock.calls.length).toBe(1);
  });

  it("uses the existing secret if the file exists", () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue(
      JSON.stringify({
        secrets: ["secret1", "secret2"],
        lastUpdated: Date.now() - 1000,
      }),
    );
    createApp({ callbacks: {} });
    expect(vi.mocked(writeFileSync).mock.calls.length).toBe(0);
    expect(vi.mocked(readFileSync).mock.calls.length).toBe(1);
  });

  it("rotates the loaded secret if it's older than 14 days", () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue(
      JSON.stringify({
        secrets: ["secret1", "secret2"],
        lastUpdated: Date.now() - 1000 * 60 * 60 * 24 * 15,
      }),
    );
    createApp({ callbacks: {} });
    expect(vi.mocked(writeFileSync).mock.calls.length).toBe(1);
    expect(vi.mocked(readFileSync).mock.calls.length).toBe(1);
    const [_, data] = vi.mocked(writeFileSync).mock.calls[0];
    const parsed = JSON.parse(data as string);
    expect(parsed.secrets[1]).toEqual("secret1");
    expect(parsed.secrets[0]).not.toEqual("secret2"); // random hex
  });

  it("rotates the secret live if the server runs for that long", () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue(
      JSON.stringify({
        secrets: ["secret1", "secret2"],
        lastUpdated: Date.now() - 1000,
      }),
    );
    createApp({ callbacks: {} });
    expect(vi.mocked(writeFileSync).mock.calls.length).toBe(0);
    vi.advanceTimersByTime(1000 * 60 * 60 * 24 * 15);
    expect(vi.mocked(writeFileSync).mock.calls.length).toBe(1);
    {
      const [_, data] = vi.mocked(writeFileSync).mock.calls[0];
      const parsed = JSON.parse(data as string);
      expect(parsed.secrets).toContain("secret1");
      expect(parsed.secrets).not.toContain("secret2"); // rotated out
    }
    vi.advanceTimersByTime(1000 * 60 * 60 * 24 * 15);
    expect(vi.mocked(writeFileSync).mock.calls.length).toBe(2);
    {
      const [_, data] = vi.mocked(writeFileSync).mock.calls[1];
      const parsed = JSON.parse(data as string);
      expect(parsed.secrets).not.toContain("secret1"); // rotated out
      expect(parsed.secrets).not.toContain("secret2"); // rotated out
    }
    vi.advanceTimersByTime(1000 * 60 * 60 * 24 * 15);
    expect(vi.mocked(writeFileSync).mock.calls.length).toBe(3);
  });
});
