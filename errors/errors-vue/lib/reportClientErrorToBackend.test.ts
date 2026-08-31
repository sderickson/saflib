import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  isLocalhostHostname,
  reportClientErrorToBackend,
} from "./reportClientErrorToBackend.ts";

vi.mock("@saflib/errors-sdk", () => ({
  recordReportedError: vi.fn(() => Promise.resolve()),
}));

import { recordReportedError } from "@saflib/errors-sdk";

describe("isLocalhostHostname", () => {
  it("matches localhost and *.localhost", () => {
    expect(isLocalhostHostname("localhost")).toBe(true);
    expect(isLocalhostHostname("app.daemon.docker.localhost")).toBe(true);
    expect(isLocalhostHostname("casedaemon.com")).toBe(false);
    expect(isLocalhostHostname("localhost.com")).toBe(false);
  });
});

describe("reportClientErrorToBackend", () => {
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

  beforeEach(() => {
    vi.mocked(recordReportedError).mockClear();
    consoleError.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("always console.errors and posts on *.localhost", async () => {
    vi.stubGlobal("location", { hostname: "app.daemon.docker.localhost" });
    const err = new Error("boom");
    await reportClientErrorToBackend(err, { source: "app", info: "render" });
    expect(consoleError).toHaveBeenCalledWith("[vue] render", err);
    expect(recordReportedError).toHaveBeenCalledOnce();
  });

  it("console.errors but does not post on production hosts", async () => {
    vi.stubGlobal("location", { hostname: "app.casedaemon.com" });
    const err = new Error("boom");
    await reportClientErrorToBackend(err, { source: "app" });
    expect(consoleError).toHaveBeenCalledWith(err);
    expect(recordReportedError).not.toHaveBeenCalled();
  });
});
