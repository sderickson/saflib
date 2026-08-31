import {
  constants,
  zstdCompress as zstdCompressCb,
  zstdDecompress as zstdDecompressCb,
} from "node:zlib";
import { promisify } from "node:util";

const zstdCompressAsync = promisify(zstdCompressCb);
const zstdDecompressAsync = promisify(zstdDecompressCb);

/**
 * Compress with Node's built-in zstd (no native addon). Level matches the
 * former `@mongodb-js/zstd` default used by audit seal (19).
 */
export async function compress(
  data: Buffer,
  level = 19,
): Promise<Buffer> {
  return zstdCompressAsync(data, {
    params: {
      [constants.ZSTD_c_compressionLevel]: level,
    },
  }) as Promise<Buffer>;
}

/** Decompress zstd bytes produced by {@link compress} or the `zstd` CLI. */
export async function decompress(data: Buffer): Promise<Buffer> {
  return zstdDecompressAsync(data) as Promise<Buffer>;
}
