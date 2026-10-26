import { http, HttpResponse } from "msw";
import type { DevSiteRequestBody } from "@saflib/dev-site-spec";
import type { ScanJob } from "./scan-jobs.ts";

type ScanBody = NonNullable<DevSiteRequestBody["executeScan"]>;
type ScanResult = NonNullable<ScanJob["result"]>;

/**
 * MSW handlers for the scan job API. `POST /api/scan` answers with a queued
 * job; the next `GET /api/scan/jobs` reports it complete with whatever
 * `onScan` returns.
 */
export function scanJobHandlers(
  onScan: (body: ScanBody) => Partial<ScanResult> | void = () => {},
  origin = "http://test.localhost:3000",
) {
  const jobs: ScanJob[] = [];
  return [
    http.post(`${origin}/api/scan`, async ({ request }) => {
      const body = (await request.json()) as ScanBody;
      const result: ScanResult = {
        scanned: [],
        skipped: [],
        failed: [],
        ...onScan(body),
      };
      const queued: ScanJob = {
        id: `job-${jobs.length + 1}`,
        status: "queued",
        ...(body.commit_hash ? { commit_hash: body.commit_hash } : {}),
        created_at: new Date().toISOString(),
      };
      jobs.unshift({
        ...queued,
        status: "complete",
        result,
        finished_at: new Date().toISOString(),
      });
      return HttpResponse.json({ scan_job: queued }, { status: 202 });
    }),
    http.get(`${origin}/api/scan/jobs`, () =>
      HttpResponse.json({ scan_jobs: jobs }),
    ),
  ];
}
