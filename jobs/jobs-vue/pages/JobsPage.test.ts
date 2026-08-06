import { describe, it, expect, vi } from "vitest";
import { stubGlobals } from "@saflib/vue/testing";
import { setupMockServer } from "@saflib/sdk/testing/mock";
import { type VueWrapper } from "@vue/test-utils";
import { http, HttpResponse, type PathParams } from "msw";
import type {
  Job,
  JobsServiceRequestBody,
  JobsServiceResponseBody,
} from "jobs-spec";
import JobsPage from "./JobsPage.vue";
import { router } from "./test_router";
import { mountTestApp } from "../test-app";

type ListJobsResponse = JobsServiceResponseBody["listJobs"][200];
type GetJobResponse = JobsServiceResponseBody["getJob"][200];
type RetryJobResponse = JobsServiceResponseBody["retryJob"][200];
type CancelJobResponse = JobsServiceResponseBody["cancelJob"][200];
type CancelByOriginalRequestResponse =
  JobsServiceResponseBody["cancelJobsByOriginalRequest"][200];
type CancelByOriginalRequestBody =
  JobsServiceRequestBody["cancelJobsByOriginalRequest"];

const makeJob = (overrides: Partial<Job> = {}): Job => ({
  id: "job-1",
  status: "pending",
  operationId: "jobsDemoStepB",
  request: { body: { failuresBeforeSuccess: 2 } },
  userId: "user-1",
  authority: { kind: "request", userId: "user-1", requestId: "r-abc" },
  originalRequestId: "r-abc",
  enqueuedByOperationId: "startJobsDemo",
  parentJobId: null,
  runAt: new Date().toISOString(),
  dedupeKey: null,
  concurrencyKey: null,
  priority: 0,
  attempt: 0,
  maxAttempts: 5,
  result: null,
  createdAt: new Date(Date.now() - 86400 * 1000).toISOString(),
  startedAt: null,
  finishedAt: null,
  ...overrides,
});

const mockJobs: Job[] = [
  makeJob({ id: "job-1", status: "pending" }),
  makeJob({
    id: "job-2",
    status: "dead",
    operationId: "jobsDemoStepC",
    attempt: 5,
    result: {
      statusCode: 500,
      errorBody: '{"error":"exhausted"}',
      terminalReason: "exhausted",
    },
    finishedAt: new Date().toISOString(),
  }),
  makeJob({
    id: "job-3",
    status: "succeeded",
    attempt: 1,
    result: { statusCode: 200, errorBody: null, terminalReason: null },
    finishedAt: new Date().toISOString(),
  }),
];

const formatDateTime = (dateTimeString: string | null | undefined): string => {
  if (!dateTimeString) return "N/A";
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(dateTimeString));
  } catch {
    return dateTimeString;
  }
};

const handlers = [
  http.get<PathParams, never, ListJobsResponse>(
    "http://test.localhost:3000/jobs",
    () => {
      return HttpResponse.json({ jobs: mockJobs });
    },
  ),
  http.get<PathParams, never, GetJobResponse>(
    "http://test.localhost:3000/jobs/:id",
    ({ params }) => {
      const job = mockJobs.find((j) => j.id === params.id) ?? mockJobs[0];
      return HttpResponse.json({
        job,
        authorityAssertion: {
          payload: "eyJ1c2VySWQiOiJ1c2VyLTEifQ",
          signature: "dGVzdC1zaWduYXR1cmU",
          keyId: "k1",
        },
      });
    },
  ),
  http.post<PathParams, never, RetryJobResponse>(
    "http://test.localhost:3000/jobs/:id/retry",
    ({ params }) => {
      return HttpResponse.json({
        job: makeJob({ id: String(params.id), status: "pending", attempt: 0 }),
      });
    },
  ),
  http.post<PathParams, never, CancelJobResponse>(
    "http://test.localhost:3000/jobs/:id/cancel",
    ({ params }) => {
      return HttpResponse.json({
        job: makeJob({
          id: String(params.id),
          status: "cancelled",
          result: {
            statusCode: undefined,
            errorBody: null,
            terminalReason: "cancelled-by-admin",
          },
          finishedAt: new Date().toISOString(),
        }),
      });
    },
  ),
  http.post<
    PathParams,
    CancelByOriginalRequestBody,
    CancelByOriginalRequestResponse
  >("http://test.localhost:3000/jobs/cancel-by-original-request", async () => {
    return HttpResponse.json({
      jobs: [makeJob({ id: "job-1", status: "cancelled" })],
    });
  }),
];

describe("JobsPage", () => {
  stubGlobals();
  const server = setupMockServer(handlers);

  const mountComponent = async (waitForData = true) => {
    await router.push("/jobs?subdomain=test");
    const wrapper = mountTestApp(JobsPage, {
      propsData: {
        subdomain: "test",
      },
    });
    if (waitForData) {
      await vi.waitFor(() => {
        expect(getLoadingIndicator(wrapper).exists()).toBe(false);
      });
    }
    return wrapper;
  };

  const getTable = (wrapper: VueWrapper) =>
    wrapper.findComponent({ name: "v-data-table" });
  const getRows = (wrapper: VueWrapper) =>
    getTable(wrapper).findAll("tbody tr");
  const getRowByJobId = (wrapper: VueWrapper, jobId: string) => {
    const rows = getRows(wrapper);
    const row = rows.find((r) => r.text().includes(jobId));
    expect(row, `Row for job "${jobId}" not found`).toBeDefined();
    return row!;
  };
  const getActionButton = (
    wrapper: VueWrapper,
    jobId: string,
    expectedText: string,
  ): VueWrapper => {
    const row = getRowByJobId(wrapper, jobId);
    const button = row
      .findAllComponents({ name: "v-btn" })
      .find((btn) => btn.text().trim() === expectedText);
    expect(
      button,
      `Button with text "${expectedText}" for job "${jobId}" not found`,
    ).toBeDefined();
    return button!;
  };
  const getLoadingIndicator = (wrapper: VueWrapper) =>
    wrapper.find('[data-testid="jobs-loading"]');
  const getErrorAlert = (wrapper: VueWrapper) =>
    wrapper.findComponent({ name: "v-alert" });

  it("should render the title and loading indicator initially", async () => {
    const wrapper = await mountComponent(false);
    expect(wrapper.find("h1").text()).toBe("Jobs");
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

    const headers = table.findAll("thead th");
    expect(headers.map((h) => h.text())).toEqual([
      "Id",
      "Status",
      "Operation",
      "User",
      "Original Request Id",
      "Attempt",
      "Created At",
      "Actions",
    ]);

    const rows = getRows(wrapper);
    expect(rows).toHaveLength(mockJobs.length);

    const row1 = getRowByJobId(wrapper, "job-1");
    expect(row1.text()).toContain("job-1");
    expect(row1.text()).toContain("jobsDemoStepB");
    expect(row1.text()).toContain("user-1");
    expect(row1.text()).toContain("r-abc");
    expect(
      row1.findComponent({ name: "v-chip", text: "pending" }).exists(),
    ).toBe(true);
    expect(row1.text()).toContain(formatDateTime(mockJobs[0].createdAt));
    expect(getActionButton(wrapper, "job-1", "Cancel").exists()).toBe(true);
    expect(getActionButton(wrapper, "job-2", "Retry").exists()).toBe(true);
  });

  it("should show job detail when View is clicked", async () => {
    const wrapper = await mountComponent();
    const viewButton = getActionButton(wrapper, "job-1", "View");
    await viewButton.trigger("click");

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("Job job-1");
      expect(wrapper.text()).toContain("Authority Assertion");
      expect(wrapper.text()).toContain("eyJ1c2VySWQiOiJ1c2VyLTEifQ");
    });
  });

  it("should retry a dead job when the Retry button is clicked", async () => {
    const wrapper = await mountComponent();
    const jobToRetry = "job-2";
    const retryButton = getActionButton(wrapper, jobToRetry, "Retry");

    let receivedId: string | null = null;
    server.use(
      http.post<PathParams, never, RetryJobResponse>(
        "http://test.localhost:3000/jobs/:id/retry",
        ({ params }) => {
          receivedId = String(params.id);
          return HttpResponse.json({
            job: makeJob({ id: jobToRetry, status: "pending", attempt: 0 }),
          });
        },
      ),
    );

    await retryButton.trigger("click");

    await vi.waitFor(() => {
      expect(receivedId).toBe(jobToRetry);
    });
  });

  it("should cancel a pending job when the Cancel button is clicked", async () => {
    const wrapper = await mountComponent();
    const jobToCancel = "job-1";
    const cancelButton = getActionButton(wrapper, jobToCancel, "Cancel");

    let receivedId: string | null = null;
    server.use(
      http.post<PathParams, never, CancelJobResponse>(
        "http://test.localhost:3000/jobs/:id/cancel",
        ({ params }) => {
          receivedId = String(params.id);
          return HttpResponse.json({
            job: makeJob({ id: jobToCancel, status: "cancelled" }),
          });
        },
      ),
    );

    await cancelButton.trigger("click");

    await vi.waitFor(() => {
      expect(receivedId).toBe(jobToCancel);
    });
  });

  it("should mass-cancel a chain when Mass Cancel Chain is clicked", async () => {
    const wrapper = await mountComponent();

    const originalRequestInput = wrapper
      .findAllComponents({ name: "v-text-field" })
      .find((field) => field.props("label") === "Original Request Id");
    expect(originalRequestInput).toBeDefined();
    await originalRequestInput!.vm.$emit("update:modelValue", "r-abc");

    let receivedBody: CancelByOriginalRequestBody | null = null;
    server.use(
      http.post<
        PathParams,
        CancelByOriginalRequestBody,
        CancelByOriginalRequestResponse
      >(
        "http://test.localhost:3000/jobs/cancel-by-original-request",
        async ({ request }) => {
          receivedBody = await request.json();
          return HttpResponse.json({
            jobs: [makeJob({ id: "job-1", status: "cancelled" })],
          });
        },
      ),
    );

    await vi.waitFor(() => {
      const massCancelButton = wrapper
        .findAllComponents({ name: "v-btn" })
        .find((btn) => btn.text() === "Mass Cancel Chain");
      expect(massCancelButton?.attributes("disabled")).toBeUndefined();
    });

    const massCancelButton = wrapper
      .findAllComponents({ name: "v-btn" })
      .find((btn) => btn.text() === "Mass Cancel Chain")!;
    await massCancelButton.trigger("click");

    await vi.waitFor(() => {
      expect(receivedBody).toEqual({ originalRequestId: "r-abc" });
    });
  });
});
