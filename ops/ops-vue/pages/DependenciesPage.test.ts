import { describe, it, expect, vi } from "vitest";
import { stubGlobals } from "@saflib/vue/testing";
import { setupMockServer } from "@saflib/sdk/testing/mock";
import { http, HttpResponse } from "msw";
import DependenciesAsync from "./DependenciesAsync.vue";
import { router } from "./test_router.ts";
import { mountTestApp } from "../test-app.ts";

const API = "http://api.localhost:3000";

describe("DependenciesAsync", () => {
  stubGlobals();
  setupMockServer([
    http.get(`${API}/ops/dependencies`, () =>
      HttpResponse.json({
        dependencies: {
          checked_at: "2026-11-09T06:00:00.000Z",
          stale: false,
          packages_total: 557,
          direct_total: 25,
          node_version: "v24.22.2",
          lockfile_hash: "h",
          advisories: [
            { id: "GHSA-1", aliases: ["CVE-2026-1"], severity: "high", package: "undici", deployed: "8.10.2", fixed_in: "8.12.2", direct: true, actionable: true, untrusted: { summary: "TLS bypass <img src=x>" } },
          ],
          outdated: [
            { name: "express", deployed: "5.2.1", latest: "5.3.0", latest_published_at: "2026-10-09T00:00:00.000Z", update: "minor", renovate_due: true },
          ],
          errors: [],
        },
      }),
    ),
  ]);

  it("lists advisories (as plain text) and outdated packages", async () => {
    await router.push("/ops/dependencies");
    const wrapper = mountTestApp(DependenciesAsync, { attachTo: document.body });
    await vi.waitFor(() => expect(wrapper.findAll("[data-test=advisory-row]")).toHaveLength(1));
    const advisory = wrapper.find("[data-test=advisory-row]");
    expect(advisory.text()).toContain("undici@8.10.2");
    expect(advisory.text()).toContain("fixed in 8.12.2");
    expect(advisory.text()).toContain("TLS bypass <img src=x>");
    expect(advisory.find("img").exists()).toBe(false);
    expect(wrapper.find("[data-test=outdated-row]").text()).toContain("5.2.1 → 5.3.0");
    expect(wrapper.find("[data-test=deps-summary]").text()).toContain("557 packages (25 direct)");
    wrapper.unmount();
  });
});
