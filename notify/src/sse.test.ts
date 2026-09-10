import { describe, expect, test } from "vitest";
import {
  SSE_HEARTBEAT_INTERVAL_MS,
  SSE_MAX_CONNECTION_MS,
  validateSseOrigin,
  writeSseComment,
  writeSseEvent,
} from "../index.ts";

class BufferWritable {
  chunks: string[] = [];
  write(chunk: string): boolean {
    this.chunks.push(chunk);
    return true;
  }
  get text(): string {
    return this.chunks.join("");
  }
}

describe("writeSseEvent", () => {
  test("frames event, data, and optional id", () => {
    const out = new BufferWritable();
    writeSseEvent(out, {
      event: "change",
      id: "42",
      data: {
        operation_id: "updateMatter",
        params: { matterId: "m1" },
        org_id: "org-a",
      },
    });

    expect(out.text).toBe(
      'id: 42\nevent: change\ndata: {"operation_id":"updateMatter","params":{"matterId":"m1"},"org_id":"org-a"}\n\n',
    );
  });

  test("omits id line when id is not provided", () => {
    const out = new BufferWritable();
    writeSseEvent(out, { event: "change", data: { ok: true } });
    expect(out.text).toBe('event: change\ndata: {"ok":true}\n\n');
  });
});

describe("writeSseComment", () => {
  test("writes heartbeat-style comment frame", () => {
    const out = new BufferWritable();
    writeSseComment(out, "heartbeat");
    expect(out.text).toBe(": heartbeat\n\n");
  });
});

describe("validateSseOrigin", () => {
  const allowed = ["https://app.example.com", "http://localhost:3000"] as const;

  test("allows missing or empty Origin", () => {
    expect(validateSseOrigin(undefined, allowed)).toBe(true);
    expect(validateSseOrigin("", allowed)).toBe(true);
  });

  test("allows listed Origin", () => {
    expect(validateSseOrigin("https://app.example.com", allowed)).toBe(true);
  });

  test("rejects Origin not on allowlist", () => {
    expect(validateSseOrigin("https://evil.example", allowed)).toBe(false);
  });
});

describe("SSE timing constants", () => {
  test("max connection is ~20 minutes and heartbeat ~30s", () => {
    expect(SSE_MAX_CONNECTION_MS).toBe(20 * 60 * 1000);
    expect(SSE_HEARTBEAT_INTERVAL_MS).toBe(30 * 1000);
  });
});
