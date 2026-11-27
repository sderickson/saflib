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

  it("reports to /errors/report (signed-in only) on other hosts, quietly when refused", async () => {
    vi.stubGlobal("location", { hostname: "app.example.com" });
    const paths: string[] = [];
    let status = 204;
    server.use(
      http.post("*/errors/:kind", async ({ request }) => {
        paths.push(new URL(request.url).pathname);
        return new HttpResponse(null, { status });
      }),
    );

    const err = new Error("boom");
    await reportClientErrorToBackend(err, { source: "app" });
    expect(consoleError).toHaveBeenCalledWith(err);
    expect(paths).toEqual(["/errors/report"]);

    status = 401;
    consoleError.mockClear();
    await reportClientErrorToBackend(new Error("signed out"), { source: "app" });
    expect(consoleError).toHaveBeenCalledTimes(1);
  });
});
