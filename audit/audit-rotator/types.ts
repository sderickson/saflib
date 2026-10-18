export interface AuditSealResult {
  status: "sealed" | "skipped";
  reason?: "empty" | "in_progress";
  archive?: {
    filename: string;
    size_bytes: number;
    sha256_hex: string;
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
