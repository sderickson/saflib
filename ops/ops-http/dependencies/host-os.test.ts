import { afterEach, describe, expect, it, vi } from "vitest";
import { hostOsFromPrometheus } from "./host-os.ts";

describe("hostOsFromPrometheus", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("reads id and version_id from node_os_info through the label proxy", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          status: "success",
          data: { result: [{ metric: { __name__: "node_os_info", id: "ubuntu", version_id: "24.10", saf_app: "host" } }] },
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    expect(await hostOsFromPrometheus({ app: "hub", proxyUrl: "http://proxy" })).toEqual({ id: "ubuntu", versionId: "24.10" });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("/api/v1/query?");
    expect(decodeURIComponent(url)).toContain('node_os_info{saf_app="host"}');
    expect((init.headers as Record<string, string>)["X-Saf-App"]).toBe("hub,host");
  });

  it("is null when the host has no node_os_info", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ status: "success", data: { result: [] } }))));
    expect(await hostOsFromPrometheus({ app: "hub", proxyUrl: "http://proxy" })).toBeNull();
  });
});
