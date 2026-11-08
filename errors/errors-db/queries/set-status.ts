import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import type { ReturnsError } from "@saflib/utils";
import { issuesDbManager } from "../instances.ts";
import type { IssueGroup } from "../schema.ts";
import { IssueNotFoundError } from "../errors.ts";
import { toGroup } from "./record-occurrence.ts";

export type SetIssueStatusParams =
  | { status: "resolved"; actor: string; note?: string; resolvedInVersion?: string }
  | { status: "ignored"; actor: string; note?: string; until?: Date | null }
  | { status: "open"; actor: string; note?: string };

export type SetIssueStatusResult = ReturnsError<IssueGroup, IssueNotFoundError>;

/** Triage: resolve, ignore (optionally until a time), or reopen. */
export const setIssueStatus = queryWrapper(
  async (dbKey: DbKey, id: string, p: SetIssueStatusParams): Promise<SetIssueStatusResult> => {
    const client = issuesDbManager.get(dbKey)!.$client;
    const changes = client
      .prepare(
        `UPDATE issue_groups SET status = ?, status_note = ?, status_changed_at = ?, status_changed_by = ?,
           resolved_in_version = ?, ignored_until = ? WHERE id = ?`,
      )
      .run(
        p.status,
        p.note?.slice(0, 500) ?? null,
        Date.now(),
        p.actor,
        p.status === "resolved" ? (p.resolvedInVersion ?? null) : null,
        p.status === "ignored" ? (p.until?.getTime() ?? null) : null,
        id,
      ).changes;
    if (changes === 0) return { error: new IssueNotFoundError(id) };
    return { result: toGroup(client.prepare(`SELECT * FROM issue_groups WHERE id = ?`).get(id) as Parameters<typeof toGroup>[0]) };
  },
);
