import fs from "node:fs";
import zlib from "node:zlib";

/** Raw and gzip byte size of a file on disk. */
export function fileByteSizes(filePath: string): { bytes: number; gzipBytes: number } {
  const buf = fs.readFileSync(filePath);
  return {
    bytes: buf.length,
    gzipBytes: zlib.gzipSync(buf).length,
  };
}

/** Sum unique file paths (caller dedupes). */
export function sumGzipBytes(
  distDir: string,
  relativeChunkFiles: string[],
): { bytes: number; gzipBytes: number } {
  let bytes = 0;
  let gzipBytes = 0;
  for (const rel of relativeChunkFiles) {
    const full = rel.startsWith("/") ? rel : `${distDir}/${rel}`.replace(/\/+/g, "/");
    if (!fs.existsSync(full)) continue;
    const s = fileByteSizes(full);
    bytes += s.bytes;
    gzipBytes += s.gzipBytes;
  }
  return { bytes, gzipBytes };
}
