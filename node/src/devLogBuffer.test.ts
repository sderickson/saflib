import { describe, it, expect, beforeEach } from "vitest";
import {
  createDevLogBufferTransport,
  enableDevLogBuffer,
  getDevLogs,
  resetDevLogBufferForTests,
  subscribeDevLogs,
} from "./devLogBuffer.ts";

describe("devLogBuffer", () => {
  beforeEach(() => {
    resetDevLogBufferForTests();
  });

  it("stores nothing until enabled", () => {
    const transport = createDevLogBufferTransport();
    transport.log({ level: "info", message: "before" }, () => {});
    expect(getDevLogs()).toEqual([]);
  });

  it("keeps the last N entries and assigns monotonic ids", () => {
    enableDevLogBuffer({ capacity: 3 });
    const transport = createDevLogBufferTransport();
    for (const message of ["a", "b", "c", "d"]) {
      transport.log({ level: "info", message }, () => {});
    }
    const logs = getDevLogs();
    expect(logs.map((e) => e.message)).toEqual(["b", "c", "d"]);
    expect(logs.map((e) => e.id)).toEqual([2, 3, 4]);
  });

  it("filters with afterId and notifies subscribers", () => {
    enableDevLogBuffer({ capacity: 10 });
    const transport = createDevLogBufferTransport();
    const seen: string[] = [];
    const unsubscribe = subscribeDevLogs((e) => {
      seen.push(e.message);
    });

    transport.log({ level: "info", message: "one" }, () => {});
    transport.log({ level: "warn", message: "two" }, () => {});
    unsubscribe();
    transport.log({ level: "info", message: "three" }, () => {});

    expect(seen).toEqual(["one", "two"]);
    expect(getDevLogs({ afterId: 1 }).map((e) => e.message)).toEqual([
      "two",
      "three",
    ]);
    expect(getDevLogs({ limit: 1 }).map((e) => e.message)).toEqual(["three"]);
  });
});
