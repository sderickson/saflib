import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { setupMockServer } from "@saflib/sdk/testing/mock";
import { http, HttpResponse } from "msw";
import {
  isLocalhostHostname,
  reportClientErrorToBackend,
} from "./reportClientErrorToBackend.ts";

const server = setupMockServer([
  http.post("http://api.localhost:3000/errors/record", async () => {
    return new HttpResponse(null, { status: 204 });
  }),
]);

describe("isLocalhostHostname", () => {
  it("matches localhost and *.localhost", () => {
    expect(isLocalhostHostname("localhost")).toBe(true);
    expect(isLocalhostHostname("app.myapp.docker.localhost")).toBe(true);
    expect(isLocalhostHostname("example.com")).toBe(false);
    expect(isLocalhostHostname("localhost.com")).toBe(false);
  });
});

describe("reportClientErrorToBackend", () => {
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

  beforeEach(() => {
    consoleError.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("always console.errors and posts on *.localhost", async () => {
    vi.stubGlobal("location", { hostname: "app.myapp.docker.localhost" });
    let posted = false;
    server.use(
      http.post("http://api.localhost:3000/errors/record", async () => {
        posted = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    const err = new Error("boom");
    await reportClientErrorToBackend(err, { source: "app", info: "render" });
    expect(consoleError).toHaveBeenCalledWith("[vue] render", err);
    expect(posted).toBe(true);
  });

  it("console.errors but does not post on production hosts", async () => {
    vi.stubGlobal("location", { hostname: "app.example.com" });
    let posted = false;
    server.use(
      http.post("http://api.localhost:3000/errors/record", async () => {
        posted = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    const err = new Error("boom");
    await reportClientErrorToBackend(err, { source: "app" });
    expect(consoleError).toHaveBeenCalledWith(err);
    expect(posted).toBe(false);
  });
});
