export interface AuditSealResult {
  status: "sealed" | "skipped";
  reason?: "empty" | "in_progress";
  archive?: {
    filename: string;
    sizeBytes: number;
    sha256Hex: string;
    /** Remote archive key returned by {@link ShipSealedArchiveCallback}. */
    archiveKey: string;
    rowCount: number;
    headHash: string;
    tailHash: string;
    branchCount?: number;
    firstTs: string;
    lastTs: string;
  };
  durationMs: number;
}

/** Compressed sealed artifact ready for host upload and off-system reporting. */
export type AuditSealArtifact = {
  filename: string;
  /** Path to the `.zst` bytes (staging until ship succeeds). */
  localPath: string;
  compressed: Buffer;
  sha256Hex: string;
  rowCount: number;
  headHash: string;
  tailHash: string;
  branchCount?: number;
  firstTs: string;
  lastTs: string;
  /** Default object key/path suggestion (host may ignore). */
  suggestedArchiveKey: string;
};

export type AuditSealTrigger =
  | { kind: "cron" }
  | { kind: "admin"; userId: string; requestId: string };

export type ShipSealedArchiveContext = {
  artifact: AuditSealArtifact;
  trigger: AuditSealTrigger;
};

/** Host uploads the sealed archive and sends the seal report (email, etc.) off-system. */
export type ShipSealedArchiveCallback = (
  ctx: ShipSealedArchiveContext,
) => Promise<{ archiveKey: string }>;

export type SealAuditDbOptions = {
  auditDbKey: import("@saflib/drizzle").DbKey;
  dataRoot: string;
  shipSealedArchive: ShipSealedArchiveCallback;
  /** Throw to abort before work begins (e.g. missing digest recipient). */
  assertSealConfigured?: () => void | Promise<void>;
  localRetentionDays?: number;
};
