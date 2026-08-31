export interface AuditSealResult {
  status: "sealed" | "skipped";
  reason?: "empty" | "in_progress";
  archive?: {
    filename: string;
    size_bytes: number;
    sha256_hex: string;
    /** Remote archive key returned by {@link ShipSealedArchiveCallback}. */
    archive_key: string;
    row_count: number;
    head_hash: string;
    tail_hash: string;
    branch_count?: number;
    first_ts: string;
    last_ts: string;
  };
  duration_ms: number;
}

/** Compressed sealed artifact ready for host upload and off-system reporting. */
export type AuditSealArtifact = {
  filename: string;
  /** Path to the `.zst` bytes (staging until ship succeeds). */
  local_path: string;
  compressed: Buffer;
  sha256_hex: string;
  row_count: number;
  head_hash: string;
  tail_hash: string;
  branch_count?: number;
  first_ts: string;
  last_ts: string;
  /** Default object key/path suggestion (host may ignore). */
  suggested_archive_key: string;
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
) => Promise<{ archive_key: string }>;

export type SealAuditDbOptions = {
  auditDbKey: import("@saflib/drizzle").DbKey;
  dataRoot: string;
  shipSealedArchive: ShipSealedArchiveCallback;
  /** Throw to abort before work begins (e.g. missing digest recipient). */
  assertSealConfigured?: () => void | Promise<void>;
  localRetentionDays?: number;
};
