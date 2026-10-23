import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { computed, ref, watch } from "vue";
import type {
  DevSiteRequestBody,
  DevSiteResponseBody,
} from "@saflib/dev-site-spec";
import { TanstackError, handleClientMethod } from "@saflib/sdk";
import { createDevSiteClient } from "./queries.ts";

export type ScanJob =
  DevSiteResponseBody["listScanJobs"][200]["scan_jobs"][number];

const SCAN_JOBS_KEY = ["dev-site", "scan-jobs"] as const;

/** Poll fast while a scan is active so the bar moves; slowly otherwise. */
const ACTIVE_POLL_MS = 500;
const IDLE_POLL_MS = 3000;

export function isActiveScanJob(job: ScanJob): boolean {
  return job.status === "queued" || job.status === "running";
}

/**
 * Scan jobs, newest first. Every subscriber shares one poll; it speeds up
 * while any job is queued or running.
 */
export function useScanJobs(subdomain: string) {
  const client = createDevSiteClient(subdomain);
  return useQuery<DevSiteResponseBody["listScanJobs"][200], TanstackError>({
    queryKey: SCAN_JOBS_KEY,
    queryFn: () => handleClientMethod(client.GET("/api/scan/jobs")),
    refetchInterval: (query) =>
      query.state.data?.scan_jobs.some(isActiveScanJob)
        ? ACTIVE_POLL_MS
        : IDLE_POLL_MS,
  });
}

/**
 * Queue scans and follow the one this component queued. When it finishes,
 * commit, checkout and diff queries refresh with the new snapshot.
 */
export function useScan(subdomain: string) {
  const client = createDevSiteClient(subdomain);
  const queryClient = useQueryClient();
  const jobs = useScanJobs(subdomain);
  const jobId = ref<string | null>(null);

  const mutation = useMutation<
    DevSiteResponseBody["executeScan"][202],
    TanstackError,
    DevSiteRequestBody["executeScan"]
  >({
    mutationFn: (body) =>
      handleClientMethod(client.POST("/api/scan", { body: body ?? {} })),
    onSuccess: (data) => {
      jobId.value = data.scan_job.id;
      queryClient.invalidateQueries({ queryKey: SCAN_JOBS_KEY });
    },
  });

  const job = computed<ScanJob | undefined>(() => {
    if (!jobId.value) return undefined;
    const polled = jobs.data.value?.scan_jobs.find((j) => j.id === jobId.value);
    if (polled) return polled;
    const queued = mutation.data.value?.scan_job;
    return queued?.id === jobId.value ? queued : undefined;
  });

  watch(
    () => job.value?.status,
    (status, previous) => {
      const finished = status === "complete" || status === "failed";
      const wasActive = previous === "queued" || previous === "running";
      if (!finished || !wasActive) return;
      for (const key of ["commits", "checkout", "commit", "commit-package", "diff"]) {
        queryClient.invalidateQueries({ queryKey: ["dev-site", key] });
      }
    },
  );

  const isScanning = computed(
    () =>
      mutation.isPending.value ||
      (job.value !== undefined && isActiveScanJob(job.value)),
  );

  const error = computed<{ message: string } | null>(() => {
    if (mutation.error.value) return mutation.error.value;
    if (job.value?.status === "failed") {
      return { message: job.value.error ?? "Scan failed" };
    }
    return null;
  });

  const result = computed(() =>
    job.value?.status === "complete" ? job.value.result : undefined,
  );

  const scan = (body: DevSiteRequestBody["executeScan"]) => {
    mutation.mutate(body);
  };

  return { scan, isScanning, error, result, job };
}
