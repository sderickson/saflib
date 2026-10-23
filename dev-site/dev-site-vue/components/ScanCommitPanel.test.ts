import { describe, it, expect, vi } from "vitest";
import { stubGlobals } from "@saflib/vue/testing";
import { setupMockServer } from "@saflib/sdk/testing/mock";
import { http, HttpResponse } from "msw";
import ScanCommitPanel from "./ScanCommitPanel.vue";
import { mountTestApp } from "../test-app.ts";
import { inlineScanCommits } from "../scan-status.ts";
import type { ScanJob } from "../requests/scan-jobs.ts";

const HASH = "b".repeat(40);
let jobs: ScanJob[] = [];

describe("ScanCommitPanel", () => {
  stubGlobals();
  setupMockServer([
    http.get("http://test.localhost:3000/api/scan/jobs", () =>
      HttpResponse.json({ scan_jobs: jobs }),
    ),
  ]);

  const mount = () =>
    mountTestApp(ScanCommitPanel, {
      propsData: { subdomain: "test", commitHash: HASH },
    });

  it("prompts to scan when no job targets the commit", async () => {
    jobs = [];
    const wrapper = mount();
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("This commit hasn’t been scanned yet");
    });
    expect(inlineScanCommits.has(HASH)).toBe(true);
    wrapper.unmount();
    expect(inlineScanCommits.has(HASH)).toBe(false);
  });

  it("shows the running job's step and progress in place of the prompt", async () => {
    jobs = [
      {
        id: "job-1",
        status: "running",
        commit_hash: HASH,
        created_at: "2026-10-23T00:00:00.000Z",
        progress: {
          commit_hash: HASH,
          commit_index: 1,
          commit_count: 1,
          phase: "parse-sources",
          phase_label: "Parsing source files",
          phase_index: 2,
          phase_count: 5,
          done: 300,
          total: 751,
          fraction: 0.2,
        },
      },
    ];
    const wrapper = mount();
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("Scanning this commit");
    });
    expect(wrapper.text()).toContain("Parsing source files 300/751 (step 2/5)");
    expect(wrapper.text()).not.toContain("Scan this commit");
    const bar = wrapper.findComponent({ name: "v-progress-linear" });
    expect(bar.props("modelValue")).toBe(20);
  });
});
