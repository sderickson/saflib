import { describe, it, expect, vi } from "vitest";
import { stubGlobals, setupMockServer } from "@saflib/vue/testing";
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
    lastRunAt: new Date(Date.now() - 3600 * 1000).toISOString(), // 1 hour ago
    lastRunStatus: "success",
    createdAt: new Date(Date.now() - 86400 * 1000 * 7).toISOString(), // 7 days ago
    updatedAt: new Date(Date.now() - 86400 * 1000).toISOString(), // 1 day ago
  },
  {
    jobName: "job-2",
    enabled: false,
    lastRunAt: null,
    lastRunStatus: null,
    createdAt: new Date(Date.now() - 86400 * 1000 * 14).toISOString(), // 14 days ago
    updatedAt: new Date(Date.now() - 86400 * 1000 * 2).toISOString(), // 2 days ago
  },
  {
    jobName: "job-3",
    enabled: true,
    lastRunAt: new Date(Date.now() - 60 * 1000).toISOString(), // 1 min ago
    lastRunStatus: "fail",
    createdAt: new Date(Date.now() - 86400 * 1000 * 1).toISOString(), // 1 day ago
    updatedAt: new Date(Date.now() - 3600 * 1000).toISOString(), // 1 hour ago
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
    "http://test.localhost:3000/cron/jobs",
    () => {
      return HttpResponse.json(mockJobs);
    },
  ),
  // Default success for updating settings
  http.put<PathParams, UpdateSettingsRequest, UpdateSettingsResponse>(
    "http://test.localhost:3000/cron/jobs/settings",
    async ({ request }) => {
      const body = await request.json();
      return HttpResponse.json({
        jobName: body.jobName,
        enabled: body.enabled,
      });
    },
  ),
];

describe("CronJobsPage", () => {
  stubGlobals(); // Sets up global mocks (ResizeObserver, location)
  const server = setupMockServer(handlers); // Sets up MSW server

  const mountComponent = async (waitForData = true) => {
    await router.push("/cron/jobs?subdomain=test");
    const wrapper = mountTestApp(CronJobsPage, {
      propsData: {
        subdomain: "test",
      },
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
      "Last Run Status",
      "Last Run At",
      "Created At",
      "Updated At",
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
    expect(
      row1.findComponent({ name: "v-chip", text: "success" }).exists(),
    ).toBe(true); // Last Run Status Chip
    expect(row1.text()).toContain(formatDateTime(mockJobs[0].lastRunAt)); // Last Run At
    expect(row1.text()).toContain(formatDateTime(mockJobs[0].createdAt)); // Created At
    expect(row1.text()).toContain(formatDateTime(mockJobs[0].updatedAt)); // Updated At
    expect(getActionButton(wrapper, "job-1", "Disable").exists()).toBe(true); // Action Button
  });

  it("should display an error message if fetching jobs fails", async () => {
    server.use(
      http.get("http://test.localhost:3000/cron/jobs", () => {
        return new HttpResponse("Internal Server Error", { status: 500 });
      }),
    );

    const wrapper = await mountComponent(false); // Mount without waiting for success

    // Wait for the error alert to appear
    await vi.waitFor(() => {
      expect(getErrorAlert(wrapper).exists()).toBe(true);
    });

    expect(getLoadingIndicator(wrapper).exists()).toBe(false);
    expect(getTable(wrapper).exists()).toBe(false);
    expect(getErrorAlert(wrapper).text()).toContain("Error loading cron jobs");
    expect(getErrorAlert(wrapper).props("type")).toBe("error");
  });

  it("should disable an enabled job when the Disable button is clicked", async () => {
    const wrapper = await mountComponent();
    const jobToDisable = "job-1";
    // Find button using the adjusted helper
    const disableButton = getActionButton(wrapper, jobToDisable, "Disable");

    let receivedRequestBody: UpdateSettingsRequest | null = null;
    server.use(
      http.put<PathParams, UpdateSettingsRequest, UpdateSettingsResponse>(
        "http://test.localhost:3000/cron/jobs/settings",
        async ({ request }) => {
          receivedRequestBody = await request.json();
          return HttpResponse.json({ jobName: jobToDisable, enabled: false });
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
        "http://test.localhost:3000/cron/jobs/settings",
        async ({ request }) => {
          receivedRequestBody = await request.json();
          return HttpResponse.json({ jobName: jobToEnable, enabled: true });
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

  it("should display an error message if updating a job fails", async () => {
    server.use(
      http.put("http://test.localhost:3000/cron/jobs/settings", () => {
        return new HttpResponse(null, {
          status: 400,
          statusText: "Bad Request",
        });
      }),
    );

    const wrapper = await mountComponent();
    const jobToDisable = "job-1";
    // Find button using the adjusted helper
    const disableButton = getActionButton(wrapper, jobToDisable, "Disable");

    await disableButton.trigger("click");

    // Wait for the error alert to appear
    await vi.waitFor(() => {
      const alert = wrapper.findComponent({ name: "v-alert" });
      expect(alert.exists()).toBe(true);
      expect(alert.text()).toContain("Error updating cron job");
      expect(alert.props("type")).toBe("error");
    });

    // Ensure button is no longer loading (i.e., not disabled)
    const updatedButton = getActionButton(wrapper, jobToDisable, "Disable");
    expect(updatedButton.attributes("disabled")).toBeUndefined();
  });
});
