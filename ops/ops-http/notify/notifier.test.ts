import { describe, expect, it } from "vitest";
import { issuesDb, recordOccurrence } from "@saflib/errors-db";
import { opsDb, upsertAlerts } from "@saflib/ops-db";
import { throwError } from "@saflib/utils";
import { runNotifierOnce, type OpsNotification } from "./notifier.ts";

function setup() {
  const dbKey = opsDb.connect();
  const issuesDbKey = issuesDb.connect();
  const sent: OpsNotification[] = [];
  let fail = false;
  const options = {
    product: "hub",
    dbKey,
    issuesDbKey,
    send: async (n: OpsNotification) => {
      if (fail) throw new Error("brevo down");
      sent.push(n);
    },
  };
  return { dbKey, issuesDbKey, sent, options, setFail: (f: boolean) => (fail = f) };
}

const firing = (fingerprint: string, alertname: string, startsAt: Date) => ({
  fingerprint,
  status: "firing" as const,
  labels: { alertname, severity: "critical", saf_app: "hub" },
  annotations: { summary: `${alertname} summary` },
  startsAt: startsAt.toISOString(),
});

describe("ops notifier", () => {
  it("batches new alerts and errors into one rate-limited notification", async () => {
    const { dbKey, issuesDbKey, sent, options } = setup();
    const t0 = new Date(Date.now() - 60 * 60_000);
    // First pass creates the cursor; nothing before it is sent.
    expect(await runNotifierOnce(options, t0)).toBe("nothing");

    const t1 = new Date(t0.getTime() + 60_000);
    await throwError(upsertAlerts(dbKey, [firing("a1", "SafDiskCritical", t1), firing("w", "Watchdog", t1)], t1));
    recordOccurrence(issuesDbKey, { level: "error", kind: "server", serviceName: "hub", message: "boom in checkout", fingerprint: "boom", ts: t1 });
    recordOccurrence(issuesDbKey, { level: "warn", kind: "server", serviceName: "hub", message: "just a warning", fingerprint: "w1", ts: t1 });

    expect(await runNotifierOnce(options, new Date(t0.getTime() + 2 * 60_000))).toBe("sent");
    expect(sent).toHaveLength(1);
    expect(sent[0]!.subject).toBe("[hub] 1 alert, 1 new error");
    expect(sent[0]!.text).toContain("[CRITICAL] SafDiskCritical: SafDiskCritical summary");
    expect(sent[0]!.text).toContain("boom in checkout");
    expect(sent[0]!.text).not.toContain("Watchdog");
    expect(sent[0]!.text).not.toContain("just a warning");

    // A new event 5 minutes later waits for the 15-minute gap...
    const t2 = new Date(t0.getTime() + 7 * 60_000);
    await throwError(upsertAlerts(dbKey, [firing("a2", "SafHighErrorRate", t2)], t2));
    expect(await runNotifierOnce(options, t2)).toBe("rate_limited");
    // ...and goes out once allowed; the still-firing first alert isn't repeated.
    expect(await runNotifierOnce(options, new Date(t0.getTime() + 20 * 60_000))).toBe("sent");
    expect(sent[1]!.subject).toBe("[hub] 1 alert");
    expect(sent[1]!.text).toContain("SafHighErrorRate");
    expect(sent[1]!.text).not.toContain("SafDiskCritical");

    expect(await runNotifierOnce(options, new Date(t0.getTime() + 40 * 60_000))).toBe("nothing");
  });

  it("keeps events for the next pass when sending fails", async () => {
    const { dbKey, sent, options, setFail } = setup();
    const t0 = new Date(Date.now() - 60 * 60_000);
    await runNotifierOnce(options, t0);
    const t1 = new Date(t0.getTime() + 60_000);
    await throwError(upsertAlerts(dbKey, [firing("a1", "SafTargetDown", t1)], t1));
    setFail(true);
    expect(await runNotifierOnce(options, new Date(t0.getTime() + 2 * 60_000))).toBe("failed");
    setFail(false);
    expect(await runNotifierOnce(options, new Date(t0.getTime() + 30 * 60_000))).toBe("sent");
    expect(sent[0]!.text).toContain("SafTargetDown");
  });
});
