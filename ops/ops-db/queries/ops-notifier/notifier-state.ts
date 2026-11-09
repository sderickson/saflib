import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import type { ReturnsError } from "@saflib/utils";
import { and, eq } from "drizzle-orm";
import { opsDbManager } from "../../instances.ts";
import { opsNotifierState, type OpsNotifierState } from "../../schema.ts";

const utcDay = (d: Date) => d.toISOString().slice(0, 10);

/**
 * The channel's state, created with the cursor at `now` on first use (so a
 * new channel doesn't notify about history).
 */
export const getNotifierState = queryWrapper(
  async (dbKey: DbKey, channel: string, now: Date = new Date()): Promise<ReturnsError<OpsNotifierState, never>> => {
    const db = opsDbManager.get(dbKey)!;
    await db
      .insert(opsNotifierState)
      .values({ channel, cursor: now, last_sent_at: null, day: utcDay(now), sent_today: 0 })
      .onConflictDoNothing();
    const row = await db.query.opsNotifierState.findFirst({ where: eq(opsNotifierState.channel, channel) });
    return { result: row! };
  },
);

export interface ClaimNotificationParams {
  channel: string;
  /** The cursor the caller read; the claim fails if another process moved it. */
  expectedCursor: Date;
  now?: Date;
  /** Minimum time between notifications. */
  minGapMs: number;
  /** Maximum notifications per UTC day. */
  dailyCap: number;
}

export type ClaimNotificationResult = ReturnsError<
  { claimed: true; since: Date } | { claimed: false; reason: "rate_limited" | "daily_cap" | "raced" },
  never
>;

/**
 * Claim the right to send one notification covering (expectedCursor, now].
 * Moves the cursor to `now` and counts the send. Compare-and-swap on the
 * cursor, so only one process (e.g. one blue-green color) wins.
 */
export const claimNotification = queryWrapper(
  async (dbKey: DbKey, p: ClaimNotificationParams): Promise<ClaimNotificationResult> => {
    const db = opsDbManager.get(dbKey)!;
    const now = p.now ?? new Date();
    const state = await db.query.opsNotifierState.findFirst({ where: eq(opsNotifierState.channel, p.channel) });
    if (!state || state.cursor.getTime() !== p.expectedCursor.getTime()) {
      return { result: { claimed: false, reason: "raced" } };
    }
    if (state.last_sent_at && now.getTime() - state.last_sent_at.getTime() < p.minGapMs) {
      return { result: { claimed: false, reason: "rate_limited" } };
    }
    const today = utcDay(now);
    const sentToday = state.day === today ? state.sent_today : 0;
    if (sentToday >= p.dailyCap) return { result: { claimed: false, reason: "daily_cap" } };
    const updated = await db
      .update(opsNotifierState)
      .set({ cursor: now, last_sent_at: now, day: today, sent_today: sentToday + 1 })
      .where(and(eq(opsNotifierState.channel, p.channel), eq(opsNotifierState.cursor, p.expectedCursor)))
      .returning();
    return updated.length > 0
      ? { result: { claimed: true, since: state.cursor } }
      : { result: { claimed: false, reason: "raced" } };
  },
);

/**
 * Undo a claim whose send failed: put the cursor back so those events go out
 * next time. Keeps `last_sent_at`, so a failing provider isn't hammered.
 */
export const releaseNotification = queryWrapper(
  async (dbKey: DbKey, channel: string, cursor: Date): Promise<ReturnsError<boolean, never>> => {
    const db = opsDbManager.get(dbKey)!;
    const rows = await db
      .update(opsNotifierState)
      .set({ cursor })
      .where(eq(opsNotifierState.channel, channel))
      .returning();
    return { result: rows.length > 0 };
  },
);
