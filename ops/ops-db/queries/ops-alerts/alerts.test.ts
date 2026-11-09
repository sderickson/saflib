import { describe, expect, it } from "vitest";
import { throwError } from "@saflib/utils";
import { ackAlert, listAlerts, opsDb, OpsAlertNotFoundError, pruneResolvedAlerts, upsertAlerts } from "../../index.ts";

const alert = (status: "firing" | "resolved", startsAt: string, endsAt = "0001-01-01T00:00:00Z") => ({
  fingerprint: "abc123",
  status,
  labels: { alertname: "SafHighErrorRate", severity: "warning", saf_app: "hub" },
  annotations: { summary: "5xx above 5%" },
  startsAt,
  endsAt,
});

describe("ops alerts", () => {
  it("tracks an alert through firing, ack, resolve and re-fire", async () => {
    const dbKey = opsDb.connect();
    const t = (h: number) => new Date(Date.UTC(2026, 10, 9, h));
    await throwError(upsertAlerts(dbKey, [alert("firing", "2026-11-09T01:00:00Z")], t(1)));
    let [row] = await throwError(listAlerts(dbKey, { statuses: ["firing"] }));
    expect(row).toMatchObject({ alertname: "SafHighErrorRate", severity: "warning", status: "firing", ends_at: null });

    await throwError(ackAlert(dbKey, row!.id, "ops_token:t1", t(2)));
    expect(await throwError(listAlerts(dbKey, { unacked: true }))).toHaveLength(0);

    // Repeat notification of the same firing keeps the ack.
    await throwError(upsertAlerts(dbKey, [alert("firing", "2026-11-09T01:00:00Z")], t(3)));
    expect(await throwError(listAlerts(dbKey, { unacked: true }))).toHaveLength(0);

    await throwError(upsertAlerts(dbKey, [alert("resolved", "2026-11-09T01:00:00Z", "2026-11-09T04:00:00Z")], t(4)));
    [row] = await throwError(listAlerts(dbKey, {}));
    expect(row).toMatchObject({ status: "resolved", ends_at: t(4) });
    expect(await throwError(listAlerts(dbKey, { activeSince: t(5) }))).toHaveLength(0);
    expect(await throwError(listAlerts(dbKey, { activeSince: t(3) }))).toHaveLength(1);

    // Firing again (new startsAt) clears the ack.
    await throwError(upsertAlerts(dbKey, [alert("firing", "2026-11-09T06:00:00Z")], t(6)));
    [row] = await throwError(listAlerts(dbKey, { unacked: true }));
    expect(row).toMatchObject({ status: "firing", acked_at: null, starts_at: t(6) });
    expect(await throwError(listAlerts(dbKey, {}))).toHaveLength(1);
  });

  it("reports unknown alerts on ack, and prunes old resolved ones", async () => {
    const dbKey = opsDb.connect();
    const { error } = await ackAlert(dbKey, "nope", "x");
    expect(error).toBeInstanceOf(OpsAlertNotFoundError);
    await throwError(
      upsertAlerts(dbKey, [alert("resolved", "2026-10-01T00:00:00Z", "2026-10-01T01:00:00Z")], new Date("2026-10-01T01:00:00Z")),
    );
    expect(await throwError(pruneResolvedAlerts(dbKey, new Date("2026-11-01T00:00:00Z")))).toBe(1);
  });
});
