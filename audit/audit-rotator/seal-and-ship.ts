import type { DbKey } from "@saflib/drizzle";
import {
  sealAuditDb,
  type AuditSealTrigger,
} from "@saflib/audit-db/seal-audit-db";
import type { ShipSealedArchiveContext } from "@saflib/audit-db/seal-types";
import type { AuditSealResult } from "./types.ts";

export type ShipSealedArchiveFn = (
  ctx: ShipSealedArchiveContext,
) => Promise<{ archive_key: string }>;

export type SealAndShipAuditDbOptions = {
  auditDbKey: DbKey;
  dataRoot: string;
  shipSealedArchive: ShipSealedArchiveFn;
  trigger: AuditSealTrigger;
  localRetentionDays?: number;
  assertSealConfigured?: () => void;
};

export async function sealAndShipAuditDb(
  options: SealAndShipAuditDbOptions,
): Promise<AuditSealResult> {
  const retentionDays = options.localRetentionDays ?? 7;

  return sealAuditDb(options.trigger, {
    auditDbKey: options.auditDbKey,
    dataRoot: options.dataRoot,
    shipSealedArchive: options.shipSealedArchive,
    localRetentionDays: retentionDays,
    assertSealConfigured: options.assertSealConfigured,
  });
}
