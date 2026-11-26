import { describe, expect, it } from "vitest";
import request from "supertest";
import { makeAdminHeaders } from "@saflib/express";
import { opsDb } from "@saflib/ops-db";
import { getIssue, issuesDb, recordOccurrence } from "@saflib/errors-db";
import { throwError } from "@saflib/utils";
import { createApp } from "../http.ts";
import type { DiagnosticProbe } from "../diagnostics/probes.ts";

const RUN = "run1abcd";

function setup(extra: DiagnosticProbe[] = []) {
  const dbKey = opsDb.connect();
  const issuesDbKey = issuesDb.connect();
  const app = createApp({ dbKey, issuesDbKey, diagnosticProbes: extra });
  return { app, issuesDbKey, admin: makeAdminHeaders() };
}

describe("ops diagnostics", () => {
  it("lists probes with what they need", async () => {
    const { app, admin } = setup();
    const res = await request(app).get("/ops/diagnostics").set(admin).expect(200);
    const byId = Object.fromEntries(res.body.probes.map((p: { id: string }) => [p.id, p]));
    expect(byId["client-vue"]).toMatchObject({ side: "client", destination: "Issues", skip_reason: null });
    expect(byId["server-warn-log"].skip_reason).toBe("Persisted logs aren't enabled here");
    expect(byId["slow-request"].skip_reason).toBe("Needs Prometheus");
    expect(byId["test-alert"].skip_reason).toMatch(/Alertmanager/);
  });

  it("finds a client probe's tagged issue, and remembers refs for product probes", async () => {
    let enqueued = 0;
    const jobProbe: DiagnosticProbe = {
      id: "job-failure",
      side: "server",
      label: "Failing job",
      what: "Enqueues a job that fails",
      destination: "Background jobs",
      link: "jobs",
      async run() {
        enqueued++;
        return { kind: "job", id: "job-123" };
      },
      async find({ remembered }) {
        return remembered ? { at: new Date(), ref: remembered } : null;
      },
    };
    const { app, issuesDbKey, admin } = setup([jobProbe]);
    const since = new Date(Date.now() - 1000).toISOString();
    recordOccurrence(issuesDbKey, { level: "error", kind: "client", serviceName: "admin", message: `[diag:${RUN}] client-vue: thrown on purpose` });

    await request(app).post(`/ops/diagnostics/runs/${RUN}/probes/job-failure`).set(admin).send({}).expect(202);
    expect(enqueued).toBe(1);
    await request(app).post(`/ops/diagnostics/runs/${RUN}/probes/client-vue`).set(admin).send({}).expect(409);
    await request(app).post(`/ops/diagnostics/runs/${RUN}/probes/slow-request`).set(admin).send({}).expect(409);

    const res = await request(app).get(`/ops/diagnostics/runs/${RUN}?since=${encodeURIComponent(since)}`).set(admin).expect(200);
    const byId = Object.fromEntries(res.body.results.map((r: { probe_id: string }) => [r.probe_id, r]));
    expect(byId["client-vue"].ref.kind).toBe("issue");
    expect(byId["client-vue"].landed_at).not.toBeNull();
    expect(byId["client-promise"].landed_at).toBeNull();
    expect(byId["job-failure"].ref).toEqual({ kind: "job", id: "job-123" });
  });

  it("clears test issues and nothing else; needs a site admin", async () => {
    const { app, issuesDbKey, admin } = setup();
    const test = recordOccurrence(issuesDbKey, { level: "error", kind: "server", serviceName: "s", message: `[diag:${RUN}] server-500: thrown on purpose` });
    const real = recordOccurrence(issuesDbKey, { level: "error", kind: "server", serviceName: "s", message: "real" });
    const res = await request(app).post("/ops/diagnostics/clear").set(admin).send({}).expect(200);
    expect(res.body.resolved_issues).toBe(1);
    expect((await throwError(getIssue(issuesDbKey, test.group.id)))?.status).toBe("resolved");
    expect((await throwError(getIssue(issuesDbKey, real.group.id)))?.status).toBe("open");
    await request(app).get("/ops/diagnostics").set({ ...admin, "x-user-is-admin": "false" }).expect(403);
  });
});
