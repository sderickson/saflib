import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

const FILENAME = "last-digest.json";

export interface LastDigestInfo {
  /** GCS object key of the most recently sealed archive. */
  archiveKey: string;
  /** Filename portion of the archive. */
  filename: string;
  /** SHA-256 (hex) of the compressed archive bytes. */
  archiveSha256Hex: string;
  /** Tail hash of that archive's chain. */
  chainTailHash: string;
  /** ISO timestamp when the digest email was sent. */
  sentAt: string;
}

export async function readLastDigest(
  dataRoot: string,
): Promise<LastDigestInfo | null> {
  try {
    const buf = await readFile(path.join(dataRoot, FILENAME));
    return JSON.parse(buf.toString()) as LastDigestInfo;
  } catch {
    return null;
  }
}

export async function writeLastDigest(
  dataRoot: string,
  info: LastDigestInfo,
): Promise<void> {
  await mkdir(dataRoot, { recursive: true });
  const tmp = path.join(dataRoot, `${FILENAME}.tmp.${process.pid}`);
  await writeFile(tmp, `${JSON.stringify(info, null, 2)}\n`);
  await rename(tmp, path.join(dataRoot, FILENAME));
}
