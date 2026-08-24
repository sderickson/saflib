import { auditDbManager } from "../../instances.ts";
import { auditEventTable, type AuditEventEntity } from "../../schemas/audit-event.ts";
import type { AuditRowContent } from "../../types.ts";
import { computeRowHash, GENESIS_HASH } from "../../hash-chain.ts";
import { withAuditWriteLock } from "../../audit-write-lock.ts";
import { generateShortId, queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import type { ReturnsError } from "@saflib/monorepo";
import { desc, sql } from "drizzle-orm";
import { getGitHashes } from "@saflib/node";
import { typedEnv } from "@saflib/env";

type AuditInsert = typeof auditEventTable.$inferInsert;

export type AppendAuditEventParams = Omit<
  AuditInsert,
  | "prev_hash"
  | "row_hash"
  | "schema_version"
  | "git_commit_root"
  | "git_commit_saflib"
  | "env"
  | "details"
> & { details?: AuditInsert["details"] };

export type AppendAuditEventError = never;

function eventTimeMs(ts: AuditInsert["ts"]): number {
  return ts.getTime();
}

export const appendAuditEvent = queryWrapper(
  async (
    dbKey: DbKey,
    params: AppendAuditEventParams,
  ): Promise<ReturnsError<AuditEventEntity, AppendAuditEventError>> => {
    const result = await withAuditWriteLock(dbKey, () => {
      const db = auditDbManager.get(dbKey)!;

      /** `behavior: "immediate"` → `BEGIN IMMEDIATE`; holds write lock while reading tail. */
      return db.transaction(
        (tx) => {
          // Chain order follows insertion order (`rowid`), not `(ts, id)` — concurrent
          // or fan-out rows often share the same millisecond timestamp.
          const tail = tx
            .select({ row_hash: auditEventTable.row_hash })
            .from(auditEventTable)
            .orderBy(desc(sql`rowid`))
            .limit(1)
            .all();

          const prev_hash =
            tail.length > 0 ? tail[0]!.row_hash : GENESIS_HASH;

          const id = params.id ?? generateShortId();
          const git = getGitHashes();
          const env = typedEnv.DEPLOYMENT_NAME;
          const tsMs = eventTimeMs(params.ts);
          const at = new Date(tsMs);
          const details = params.details ?? null;

          const content: AuditRowContent = {
            id,
            ts: tsMs,
            schema_version: 1,
            source: params.source,
            actor_user_id: params.actor_user_id ?? null,
            on_behalf_of_user_id: params.on_behalf_of_user_id ?? null,
            auth_method: params.auth_method ?? null,
            request_id: params.request_id ?? null,
            client_ip: params.client_ip ?? null,
            event_type: params.event_type,
            resource_type: params.resource_type ?? null,
            resource_id: params.resource_id ?? null,
            outcome: params.outcome,
            git_commit_root: git.root,
            git_commit_saflib: git.saflib,
            env,
            details,
          };

          const row_hash = computeRowHash(prev_hash, content);

          const rows = tx
            .insert(auditEventTable)
            .values({
              id,
              ts: at,
              prev_hash,
              row_hash,
              schema_version: 1,
              source: params.source,
              actor_user_id: params.actor_user_id ?? null,
              on_behalf_of_user_id: params.on_behalf_of_user_id ?? null,
              auth_method: params.auth_method ?? null,
              request_id: params.request_id ?? null,
              client_ip: params.client_ip ?? null,
              event_type: params.event_type,
              resource_type: params.resource_type ?? null,
              resource_id: params.resource_id ?? null,
              outcome: params.outcome,
              git_commit_root: git.root,
              git_commit_saflib: git.saflib,
              env,
              details,
            })
            .returning()
            .all();

          return rows[0]!;
        },
        { behavior: "immediate" },
      );
    });

    return { result };
  },
);
