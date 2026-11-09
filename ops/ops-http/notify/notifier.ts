import type { DbKey } from "@saflib/drizzle";
import { listIssues } from "@saflib/errors-db";
import { claimNotification, getNotifierState, listAlerts, releaseNotification } from "@saflib/ops-db";
import { getSafReporters } from "@saflib/node";
import { throwError } from "@saflib/utils";
import { WATCHDOG_ALERTNAME } from "../routes/alerts.ts";

export interface OpsNotification {
  subject: string;
  text: string;
}

export interface OpsNotifierOptions {
  /** Shown in the subject, e.g. "hub". */
  product: string;
  dbKey: DbKey;
  /** New error-level issues are included when set. */
  issuesDbKey?: DbKey;
  /** Deliver one notification (e.g. email every site admin). */
  send: (n: OpsNotification) => Promise<void>;
  /** How often to look for new events (default 5 minutes). */
  intervalMs?: number;
  /** Minimum time between notifications (default 15 minutes). */
  minGapMs?: number;
  /** Maximum notifications per UTC day (default 12). */
  dailyCap?: number;
  /** State channel (default "email"). */
  channel?: string;
}

const LIST_MAX = 10;

function parseAnnotations(json: string): Record<string, string> {
  try {
    return JSON.parse(json) as Record<string, string>;
  } catch {
    return {};
  }
}

/** Collect events after `since` and format them; null when there are none. */
export async function buildNotification(
  options: Pick<OpsNotifierOptions, "product" | "dbKey" | "issuesDbKey">,
  since: Date,
): Promise<OpsNotification | null> {
  const alerts = (
    await throwError(listAlerts(options.dbKey, { activeSince: since, excludeAlertnames: [WATCHDOG_ALERTNAME], limit: 200 }))
  ).filter((a) => a.starts_at > since || a.first_received_at > since);
  let newIssues: { title: string; level: string; count: number }[] = [];
  let regressed: { title: string; level: string; count: number }[] = [];
  if (options.issuesDbKey) {
    const [fresh, back] = await Promise.all([
      throwError(listIssues(options.issuesDbKey, { windowSince: since, newInWindow: true, levels: ["error", "fatal"], limit: 200 })),
      throwError(listIssues(options.issuesDbKey, { windowSince: since, regressedInWindow: true, levels: ["error", "fatal"], limit: 200 })),
    ]);
    newIssues = fresh.issues.filter((i) => i.status !== "ignored").map((i) => ({ title: i.title, level: i.level, count: i.window_count }));
    regressed = back.issues.map((i) => ({ title: i.title, level: i.level, count: i.window_count }));
  }
  if (alerts.length + newIssues.length + regressed.length === 0) return null;

  const parts: string[] = [];
  if (alerts.length) parts.push(`${alerts.length} alert${alerts.length === 1 ? "" : "s"}`);
  if (newIssues.length) parts.push(`${newIssues.length} new error${newIssues.length === 1 ? "" : "s"}`);
  if (regressed.length) parts.push(`${regressed.length} regression${regressed.length === 1 ? "" : "s"}`);

  const lines: string[] = [`Since ${since.toISOString()}:`, ""];
  const section = <T>(title: string, items: T[], fmt: (t: T) => string) => {
    if (!items.length) return;
    lines.push(`${title}:`);
    for (const item of items.slice(0, LIST_MAX)) lines.push(`  - ${fmt(item)}`);
    if (items.length > LIST_MAX) lines.push(`  - and ${items.length - LIST_MAX} more`);
    lines.push("");
  };
  section("Alerts", alerts, (a) => {
    const summary = parseAnnotations(a.annotations).summary ?? a.alertname;
    const state = a.status === "firing" ? (a.severity ?? "firing").toUpperCase() : "RESOLVED";
    return `[${state}] ${a.alertname}: ${summary}`;
  });
  section("New errors", newIssues, (i) => `${i.title} (${i.count}x)`);
  section("Regressed", regressed, (i) => `${i.title} (${i.count}x)`);
  lines.push("Details: GET /ops/digest, /ops/alerts and /ops/issues, or the admin pages.");
  lines.push("Emails are batched: at most one every 15 minutes and 12 a day.");
  return { subject: `[${options.product}] ${parts.join(", ")}`, text: lines.join("\n") };
}

/**
 * One notifier pass: if there are new events since the cursor and a send is
 * allowed (rate limit, daily cap, no other process sending), send one
 * batched notification. Returns what happened, for tests and logs.
 */
export async function runNotifierOnce(
  options: OpsNotifierOptions,
  now: Date = new Date(),
): Promise<"nothing" | "sent" | "rate_limited" | "daily_cap" | "raced" | "failed"> {
  const channel = options.channel ?? "email";
  const state = await throwError(getNotifierState(options.dbKey, channel, now));
  const notification = await buildNotification(options, state.cursor);
  if (!notification) return "nothing";
  const claim = await throwError(
    claimNotification(options.dbKey, {
      channel,
      expectedCursor: state.cursor,
      now,
      minGapMs: options.minGapMs ?? 15 * 60_000,
      dailyCap: options.dailyCap ?? 12,
    }),
  );
  if (!claim.claimed) return claim.reason;
  try {
    await options.send(notification);
    return "sent";
  } catch (e) {
    await throwError(releaseNotification(options.dbKey, channel, claim.since));
    try {
      getSafReporters().logError(e);
    } catch {
      // No SAF context; the failure is still returned.
    }
    return "failed";
  }
}

/** Run the notifier every `intervalMs` until the returned stop function is called. */
export function startOpsNotifier(options: OpsNotifierOptions): () => void {
  let running = false;
  const timer = setInterval(() => {
    if (running) return;
    running = true;
    runNotifierOnce(options)
      .catch((e) => {
        try {
          getSafReporters().logError(e);
        } catch {
          // Nothing else to do outside a SAF context.
        }
      })
      .finally(() => {
        running = false;
      });
  }, options.intervalMs ?? 5 * 60_000);
  timer.unref();
  return () => clearInterval(timer);
}

/** Anything with `sendEmail` (e.g. `@saflib/email-service`'s EmailService). */
export interface EmailSenderLike {
  sendEmail(options: { to: string[]; from: string; subject: string; text: string }): Promise<unknown>;
}

/** Site admins from `ADMIN_EMAILS` (comma-separated), the same list that grants admin. */
export function adminEmailsFromEnv(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** A notifier `send` that emails every site admin; no-op when there are none. */
export function adminEmailSender(
  email: EmailSenderLike,
  from: string,
  recipients: () => string[] = adminEmailsFromEnv,
): OpsNotifierOptions["send"] {
  return async ({ subject, text }) => {
    const to = recipients();
    if (to.length === 0) return;
    await email.sendEmail({ to, from, subject, text });
  };
}
