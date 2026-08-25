import { describe, it, expect, vi } from "vitest";
import { stubGlobals } from "@saflib/vue/testing";
import { setupMockServer } from "@saflib/sdk/testing/mock";
import { type VueWrapper } from "@vue/test-utils";
import { http, HttpResponse, type PathParams } from "msw";
import type { CronResponseBody, CronRequestBody } from "@saflib/cron-spec"; // Assuming types are available
import CronJobsPage from "./CronJobsPage.vue";
import { router } from "./test_router";
import { mountTestApp } from "../test-app";
type ListCronJobsResponse = CronResponseBody["listCronJobs"][200];
type UpdateSettingsResponse = CronResponseBody["updateCronJobSettings"][200];
type UpdateSettingsRequest = CronRequestBody["updateCronJobSettings"];

// Mock data based on job_settings.yaml and component usage
const mockJobs: ListCronJobsResponse = [
  {
    jobName: "job-1",
    enabled: true,
    enabledBy: "admin-user-1",
    lastRunAt: new Date(Date.now() - 3600 * 1000).toISOString(),
    lastRunStatus: "success",
    schedule: "*/15 * * * *",
    runsNextAt: new Date(Date.now() + 900 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 86400 * 1000 * 7).toISOString(),
    updatedAt: new Date(Date.now() - 86400 * 1000).toISOString(),
  },
  {
    jobName: "job-2",
    enabled: false,
    enabledBy: null,
    lastRunAt: null,
    lastRunStatus: null,
    schedule: "0 3 * * *",
    runsNextAt: null,
    createdAt: new Date(Date.now() - 86400 * 1000 * 14).toISOString(),
    updatedAt: new Date(Date.now() - 86400 * 1000 * 2).toISOString(),
  },
  {
    jobName: "job-3",
    enabled: true,
    enabledBy: null,
    lastRunAt: new Date(Date.now() - 60 * 1000).toISOString(),
    lastRunStatus: "fail",
    schedule: "* * * * *",
    runsNextAt: null,
    createdAt: new Date(Date.now() - 86400 * 1000 * 1).toISOString(),
    updatedAt: new Date(Date.now() - 3600 * 1000).toISOString(),
  },
];

const formatDateTime = (dateTimeString: string | null | undefined): string => {
  if (!dateTimeString) return "N/A";
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(dateTimeString));
  } catch (e) {
    return dateTimeString;
  }
};

// MSW Handlers
const handlers = [
  // Default success for listing jobs
  http.get<PathParams, never, ListCronJobsResponse>(
    "http://api.localhost:3000/cron/jobs",
    () => {
      return HttpResponse.json(mockJobs);
    },
  ),
  // Default success for updating settings
  http.put<PathParams, UpdateSettingsRequest, UpdateSettingsResponse>(
    "http://api.localhost:3000/cron/jobs/settings",
    async ({ request }) => {
      const body = await request.json();
      return HttpResponse.json({
        jobName: body.jobName,
        enabled: body.enabled,
        enabledBy: body.enabled ? "admin-user-1" : null,
      });
    },
  ),
];

describe("CronJobsPage", () => {
  stubGlobals(); // Sets up global mocks (ResizeObserver, location)
  const server = setupMockServer(handlers); // Sets up MSW server

  const mountComponent = async (waitForData = true) => {
    await router.push("/cron/jobs");
    const wrapper = mountTestApp(CronJobsPage, {
      props: {},
    });
    if (waitForData) {
      await vi.waitFor(() => {
        expect(
          wrapper.findComponent({ name: "v-progress-linear" }).exists(),
        ).toBe(false);
      });
    }
    return wrapper;
  };

  const getTable = (wrapper: VueWrapper) =>
    wrapper.findComponent({ name: "v-data-table" });
  const getRows = (wrapper: VueWrapper) =>
    getTable(wrapper).findAll("tbody tr");
  const getRowByJobName = (wrapper: VueWrapper, jobName: string) => {
    const rows = getRows(wrapper);
    const row = rows.find((r) => r.text().includes(jobName));
    expect(row, `Row for job "${jobName}" not found`).toBeDefined();
    return row!;
  };
  const getActionButton = (
    wrapper: VueWrapper,
    jobName: string,
    expectedText: string,
  ): VueWrapper => {
    const row = getRowByJobName(wrapper, jobName);
    // Find the button component within the row's DOM element
    const button = row.findComponent({ name: "v-btn", text: expectedText });
    expect(
      button.exists(),
      `Button with text "${expectedText}" for job "${jobName}" not found`,
    ).toBe(true);
    return button;
  };
  const getLoadingIndicator = (wrapper: VueWrapper) =>
    wrapper.findComponent({ name: "v-progress-linear" });
  const getErrorAlert = (wrapper: VueWrapper) =>
    wrapper.findComponent({ name: "v-alert" });

  // --- Tests ---

  it("should render the title and loading indicator initially", async () => {
    const wrapper = await mountComponent(false);
    expect(wrapper.find("h1").text()).toBe("Cron Jobs");
    expect(getLoadingIndicator(wrapper).exists()).toBe(true);
    expect(getTable(wrapper).exists()).toBe(false);
    expect(getErrorAlert(wrapper).exists()).toBe(false);
  });

  it("should render the table with job data after loading", async () => {
    const wrapper = await mountComponent();
    expect(getLoadingIndicator(wrapper).exists()).toBe(false);
    expect(getErrorAlert(wrapper).exists()).toBe(false);

    const table = getTable(wrapper);
    expect(table.exists()).toBe(true);

    // Check headers
    const headers = table.findAll("thead th");
    expect(headers.map((h) => h.text())).toEqual([
      "Job Name",
      "Status",
      "Enabled By",
      "Last Run Status",
      "Last Run At",
      "Runs Next",
      "Actions",
    ]);

    // Check rows
    const rows = getRows(wrapper);
    expect(rows).toHaveLength(mockJobs.length);

    // Check data in the first row (job-1)
    const row1 = getRowByJobName(wrapper, "job-1");
    expect(row1.text()).toContain("job-1"); // Job Name
    expect(
      row1.findComponent({ name: "v-chip", text: "Enabled" }).exists(),
    ).toBe(true); // Status Chip
    expect(row1.text()).toContain("admin-user-1");
    expect(
      row1.findComponent({ name: "v-chip", text: "success" }).exists(),
    ).toBe(true); // Last Run Status Chip
    expect(row1.text()).toContain(formatDateTime(mockJobs[0].lastRunAt));
    expect(row1.text()).toContain(formatDateTime(mockJobs[0].runsNextAt));
    expect(getActionButton(wrapper, "job-1", "Disable").exists()).toBe(true);
  });

  it("warns when enabled but enabledBy is null", async () => {
    const wrapper = await mountComponent();
    const row3 = getRowByJobName(wrapper, "job-3");
    expect(
      row3.findComponent({ name: "v-chip", text: "Re-enable required" }).exists(),
    ).toBe(true);
    expect(row3.text()).toContain(
      "Missing — re-enable to record authority (job is not running)",
    );
  });

  it("should disable an enabled job when the Disable button is clicked", async () => {
    const wrapper = await mountComponent();
    const jobToDisable = "job-1";
    // Find button using the adjusted helper
    const disableButton = getActionButton(wrapper, jobToDisable, "Disable");

    let receivedRequestBody: UpdateSettingsRequest | null = null;
    server.use(
      http.put<PathParams, UpdateSettingsRequest, UpdateSettingsResponse>(
        "http://api.localhost:3000/cron/jobs/settings",
        async ({ request }) => {
          receivedRequestBody = await request.json();
          return HttpResponse.json({
            jobName: jobToDisable,
            enabled: false,
            enabledBy: "admin-user-1",
          });
        },
      ),
    );

    await disableButton.trigger("click");

    // Check button loading state by checking if it's disabled
    await vi.waitFor(() => {
      const updatedButton = getActionButton(wrapper, jobToDisable, "Disable");
      expect(updatedButton.attributes("disabled")).toBeDefined(); // Loading usually means disabled
    });

    // Wait for API call to complete and check payload
    await vi.waitFor(() => {
      expect(receivedRequestBody).not.toBeNull();
    });
    expect(receivedRequestBody).toEqual({
      jobName: jobToDisable,
      enabled: false,
    });

    // Ensure button is no longer loading (i.e., not disabled)
    const updatedButton = getActionButton(wrapper, jobToDisable, "Disable");
    expect(updatedButton.attributes("disabled")).toBeUndefined();
  });

  it("should enable a disabled job when the Enable button is clicked", async () => {
    const wrapper = await mountComponent();
    const jobToEnable = "job-2";
    // Find button using the adjusted helper
    const enableButton = getActionButton(wrapper, jobToEnable, "Enable");

    let receivedRequestBody: UpdateSettingsRequest | null = null;
    server.use(
      http.put<PathParams, UpdateSettingsRequest, UpdateSettingsResponse>(
        "http://api.localhost:3000/cron/jobs/settings",
        async ({ request }) => {
          receivedRequestBody = await request.json();
          return HttpResponse.json({
            jobName: jobToEnable,
            enabled: true,
            enabledBy: "admin-user-1",
          });
        },
      ),
    );

    await enableButton.trigger("click");

    // Check loading state by checking if it's disabled
    await vi.waitFor(() => {
      const updatedButton = getActionButton(wrapper, jobToEnable, "Enable");
      expect(updatedButton.attributes("disabled")).toBeDefined(); // Loading usually means disabled
    });

    // Check API call
    await vi.waitFor(() => {
      expect(receivedRequestBody).not.toBeNull();
    });
    expect(receivedRequestBody).toEqual({
      jobName: jobToEnable,
      enabled: true,
    });
  });
});
