import { Readable } from "node:stream";
import type { LogChunk } from "./types.ts";

/**
 * A step's output is a pipeable Node stream (object mode) of `LogChunk`s,
 * not a callback the lib invokes — so a consumer (CLI, HTTP handler) can
 * `for await` it, `.pipe()` it, or forward it without lib knowing who's on
 * the other end. See spec.md's "Output streams" section.
 */
export function createOutputStream(): {
  stream: Readable;
  write: (chunk: LogChunk) => void;
  end: () => void;
} {
  const stream = new Readable({
    objectMode: true,
    read() {},
  });
  return {
    stream,
    write: (chunk) => {
      stream.push(chunk);
    },
    end: () => {
      stream.push(null);
    },
  };
}

/** Convenience for tests/proof scripts: drains a step's stream into an array. */
export async function collectOutput(stream: Readable): Promise<LogChunk[]> {
  const chunks: LogChunk[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk as LogChunk);
  }
  return chunks;
}
