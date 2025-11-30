import type { Backup } from "@saflib/backup-spec";

type ObjectStoreFile = {
  path: string;
  size?: number;
  metadata?: Record<string, string>;
};

export function mapObjectStoreFileToBackup(
  file: ObjectStoreFile,
): Backup | null {
  const filename = file.path.split("/").pop() || file.path;

  const match = filename.match(/^backup-(\d+)-(\w+)-(.+)\.db$/);
  if (!match) {
    return null;
  }

  const [, timestampStr, type, id] = match;

  if (type !== "manual" && type !== "automatic") {
    return null;
  }

  const timestamp = new Date(parseInt(timestampStr, 10)).toISOString();

  return {
    id,
    type: type as "manual" | "automatic",
    timestamp,
    size: file.size ?? 0,
    path: file.path,
    metadata: file.metadata,
  };
}
