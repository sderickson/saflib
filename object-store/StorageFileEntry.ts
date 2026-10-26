/** Fields mirrored from a GCS object (legacy stored these on `concert.files[]`). */
export interface StorageFileEntry {
  path: string;
  size?: number;
  metadata?: Record<string, string>;
  updated?: string;
  timeCreated?: string;
  bucket?: string;
  contentType?: string;
  crc32c?: string;
  etag?: string;
  generation?: string;
  id?: string;
  kind?: string;
  md5Hash?: string;
  mediaLink?: string;
  metageneration?: string;
  name?: string;
  owner?: { entity?: string; entityId?: string };
  selfLink?: string;
  storageClass?: string;
}

export function gcsMetadataToStorageFileEntry(
  gcs: Record<string, unknown>,
  bucketName: string,
  objectName: string,
): StorageFileEntry {
  const updated =
    (gcs.updated as string | undefined) ??
    (gcs.timeCreated as string | undefined);
  const custom = gcs.metadata as Record<string, string> | undefined;

  return {
    path: objectName,
    name: (gcs.name as string | undefined) ?? objectName,
    id: (gcs.id as string | undefined) ?? objectName,
    bucket: (gcs.bucket as string | undefined) ?? bucketName,
    size:
      gcs.size !== undefined && gcs.size !== null
        ? Number(gcs.size)
        : undefined,
    contentType: gcs.contentType as string | undefined,
    crc32c: gcs.crc32c as string | undefined,
    etag: gcs.etag as string | undefined,
    generation:
      gcs.generation != null ? String(gcs.generation) : undefined,
    kind: gcs.kind as string | undefined,
    md5Hash: gcs.md5Hash as string | undefined,
    mediaLink: gcs.mediaLink as string | undefined,
    metageneration:
      gcs.metageneration != null ? String(gcs.metageneration) : undefined,
    owner: gcs.owner as StorageFileEntry["owner"],
    selfLink: gcs.selfLink as string | undefined,
    storageClass: gcs.storageClass as string | undefined,
    updated,
    timeCreated: gcs.timeCreated as string | undefined,
    metadata: custom,
  };
}
