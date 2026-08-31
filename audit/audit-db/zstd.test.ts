import { describe, expect, it } from "vitest";
import { compress, decompress } from "./zstd.ts";

describe("zstd (node:zlib)", () => {
  it("round-trips at seal compression level", async () => {
    const input = Buffer.from("audit-event-payload ".repeat(500));
    const compressed = await compress(input, 19);
    expect(compressed.length).toBeLessThan(input.length);
    const out = await decompress(compressed);
    expect(out.equals(input)).toBe(true);
  });
});
