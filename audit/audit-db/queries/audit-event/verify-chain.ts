import { auditDbManager } from "../../instances.ts";
import { getAuditSqliteDriver } from "../../sqlite-driver.ts";
import {
  auditEventTable,
  type AuditEventDetails,
  type AuditEventEntity,
} from "../../schemas/audit-event.ts";
import type { AuditRowContent } from "../../types.ts";
import { computeRowHash, GENESIS_HASH } from "../../hash-chain.ts";
import { MixedAuditSchemaVersionError } from "../../errors.ts";
import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import type { ReturnsError } from "@saflib/monorepo";
import { and, asc, gte, lte, sql, type SQL } from "drizzle-orm";
export type VerifyAuditChainParams = {
  from?: Date | number;
  to?: Date | number;
  /** When set, allows verifying ranges that contain multiple `schema_version` values. */
  expectedGenesis?: string;
};

export type VerifyAuditChainFailureReason =
  | "row_hash_mismatch"
  | "unknown_prev_hash";

export type VerifyAuditChainSuccess =
  | {
      valid: true;
      rowCount: 0;
      headHash: null;
      tailHash: null;
      branchCount: 0;
    }
  | {
      valid: true;
      rowCount: number;
      headHash: string;
      tailHash: string;
      /** Rows that share a parent with at least one sibling (fork duplicates). */
      branchCount: number;
    };

export type VerifyAuditChainFailure = {
  valid: false;
  firstBadId: string;
  firstBadIndex: number;
  reason: VerifyAuditChainFailureReason;
};

export type VerifyAuditChainResult =
  | VerifyAuditChainSuccess
  | VerifyAuditChainFailure;

export type VerifyAuditChainError = MixedAuditSchemaVersionError;

function toEpochMs(value: Date | number | undefined): number | undefined {
  if (value === undefined) return undefined;
  return value instanceof Date ? value.getTime() : Number(value);
}

function tsBoundsWhere(
  fromMs?: number,
  toMs?: number,
): SQL | undefined {
  const parts: SQL[] = [];
  if (fromMs !== undefined) {
    parts.push(gte(auditEventTable.ts, new Date(fromMs)));
  }
  if (toMs !== undefined) {
    parts.push(lte(auditEventTable.ts, new Date(toMs)));
  }
  if (parts.length === 0) return undefined;
  return and(...parts)!;
}

/**
 * Maps a better-sqlite3 `iterate()` row (driver shapes) into `AuditEventEntity`.
 * Exported for focused unit tests (driver may return JSON as string or parsed object).
 */
export function mapAuditEventSqliteIterateRow(
  raw: Record<string, unknown>,
): AuditEventEntity {
  const detailsRaw = raw.details;
  let details: AuditEventDetails | null = null;
  if (detailsRaw != null && detailsRaw !== "") {
    const asText =
      typeof detailsRaw === "string"
        ? detailsRaw
        : JSON.stringify(detailsRaw);
    details = JSON.parse(asText) as AuditEventDetails;
  }
  return {
    id: String(raw.id),
    ts: new Date(Number(raw.ts)),
    prev_hash: String(raw.prev_hash),
    row_hash: String(raw.row_hash),
    schema_version: Number(raw.schema_version),
    source: raw.source as AuditEventEntity["source"],
    actor_user_id:
      raw.actor_user_id == null ? null : String(raw.actor_user_id),
    on_behalf_of_user_id:
      raw.on_behalf_of_user_id == null
        ? null
        : String(raw.on_behalf_of_user_id),
    auth_method:
      raw.auth_method == null ? null : String(raw.auth_method),
    request_id:
      raw.request_id == null ? null : String(raw.request_id),
    client_ip: raw.client_ip == null ? null : String(raw.client_ip),
    event_type: String(raw.event_type),
    resource_type:
      raw.resource_type == null ? null : String(raw.resource_type),
    resource_id:
      raw.resource_id == null ? null : String(raw.resource_id),
    outcome: String(raw.outcome),
    git_commit_root: String(raw.git_commit_root),
    git_commit_saflib: String(raw.git_commit_saflib),
    env: String(raw.env),
    details,
  };
}

function entityToRowContent(row: AuditEventEntity): AuditRowContent {
  return {
    id: row.id,
    ts: row.ts.getTime(),
    schema_version: row.schema_version,
    source: row.source,
    actor_user_id: row.actor_user_id,
    on_behalf_of_user_id: row.on_behalf_of_user_id,
    auth_method: row.auth_method,
    request_id: row.request_id,
    client_ip: row.client_ip,
    event_type: row.event_type,
    resource_type: row.resource_type,
    resource_id: row.resource_id,
    outcome: row.outcome,
    git_commit_root: row.git_commit_root,
    git_commit_saflib: row.git_commit_saflib,
    env: row.env,
    details: row.details,
  };
}

function countBranches(rows: readonly AuditEventEntity[]): number {
  const childrenByPrev = new Map<string, number>();
  for (const row of rows) {
    childrenByPrev.set(
      row.prev_hash,
      (childrenByPrev.get(row.prev_hash) ?? 0) + 1,
    );
  }
  let branchCount = 0;
  for (const childCount of childrenByPrev.values()) {
    if (childCount > 1) {
      branchCount += childCount - 1;
    }
  }
  return branchCount;
}

export const verifyAuditChain = queryWrapper(
  async (
    dbKey: DbKey,
    params: VerifyAuditChainParams,
  ): Promise<
    ReturnsError<VerifyAuditChainResult, VerifyAuditChainError>
  > => {
    const drizzleDb = auditDbManager.get(dbKey)!;
    const sqliteDb = getAuditSqliteDriver(dbKey);

    const fromMs = toEpochMs(params.from);
    const toMs = toEpochMs(params.to);
    const boundsWhere = tsBoundsWhere(fromMs, toMs);

    const metaQuery =
      boundsWhere !== undefined
        ? drizzleDb
            .select({
              minSv: sql<number>`min(${auditEventTable.schema_version})`.mapWith(
                Number,
              ),
              maxSv: sql<number>`max(${auditEventTable.schema_version})`.mapWith(
                Number,
              ),
              cnt: sql<number>`count(*)`.mapWith(Number),
            })
            .from(auditEventTable)
            .where(boundsWhere)
        : drizzleDb
            .select({
              minSv: sql<number>`min(${auditEventTable.schema_version})`.mapWith(
                Number,
              ),
              maxSv: sql<number>`max(${auditEventTable.schema_version})`.mapWith(
                Number,
              ),
              cnt: sql<number>`count(*)`.mapWith(Number),
            })
            .from(auditEventTable);
    const meta = metaQuery.get()!;
    const rowCount = meta.cnt;

    if (rowCount === 0) {
      return {
        result: {
          valid: true,
          rowCount: 0,
          headHash: null,
          tailHash: null,
          branchCount: 0,
        },
      };
    }

    const minSv = meta!.minSv!;
    const maxSv = meta!.maxSv!;
    if (
      minSv !== maxSv &&
      params.expectedGenesis === undefined
    ) {
      return { error: new MixedAuditSchemaVersionError() };
    }

    const chainSelect =
      boundsWhere !== undefined
        ? drizzleDb
            .select()
            .from(auditEventTable)
            .where(boundsWhere)
            .orderBy(asc(sql`rowid`))
        : drizzleDb
            .select()
            .from(auditEventTable)
            .orderBy(asc(sql`rowid`));

    const { sql: sqlText, params: sqlParams } = chainSelect.toSQL();
    const stmt = sqliteDb.prepare(sqlText);

    const allRowHashes = new Set(
      drizzleDb
        .select({ row_hash: auditEventTable.row_hash })
        .from(auditEventTable)
        .all()
        .map((row) => row.row_hash),
    );

    const genesisExpected = params.expectedGenesis ?? GENESIS_HASH;

    const scopedRows: AuditEventEntity[] = [];
    for (const raw of stmt.iterate(...sqlParams)) {
      scopedRows.push(
        mapAuditEventSqliteIterateRow(raw as Record<string, unknown>),
      );
    }

    if (scopedRows.length === 0) {
      return {
        result: {
          valid: true,
          rowCount: 0,
          headHash: null,
          tailHash: null,
          branchCount: 0,
        },
      };
    }

    for (let index = 0; index < scopedRows.length; index += 1) {
      const row = scopedRows[index]!;

      const content = entityToRowContent(row);
      const expectedHash = computeRowHash(row.prev_hash, content);
      if (expectedHash !== row.row_hash) {
        return {
          result: {
            valid: false,
            firstBadId: row.id,
            firstBadIndex: index,
            reason: "row_hash_mismatch",
          },
        };
      }

      const parentKnown =
        row.prev_hash === genesisExpected ||
        allRowHashes.has(row.prev_hash);
      if (!parentKnown) {
        return {
          result: {
            valid: false,
            firstBadId: row.id,
            firstBadIndex: index,
            reason: "unknown_prev_hash",
          },
        };
      }
    }

    const branchCount = countBranches(scopedRows);

    return {
      result: {
        valid: true,
        rowCount: scopedRows.length,
        headHash: scopedRows[0]!.row_hash,
        tailHash: scopedRows[scopedRows.length - 1]!.row_hash,
        branchCount,
      },
    };
  },
);
