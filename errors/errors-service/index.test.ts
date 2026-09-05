import { describe, it, expect, beforeEach } from "vitest";
import {
  listReportedErrors,
  recordReportedError,
  resetReportedErrorBufferForTests,
  setReportedErrorBufferCapacityForTests,
} from "./in-memory/reportedErrorBuffer.ts";

describe("reportedErrorBuffer", () => {
  beforeEach(() => {
    resetReportedErrorBufferForTests();
  });

  it("records and lists errors in order", () => {
    recordReportedError({
      kind: "client",
      message: "first",
      source: "web-app",
    });
    recordReportedError({
      kind: "server",
      message: "second",
      source: "http",
    });

    const entries = listReportedErrors();
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({ kind: "client", message: "first" });
    expect(entries[1]).toMatchObject({ kind: "server", message: "second" });
  });

  it("filters by kind and source", () => {
    recordReportedError({
      kind: "client",
      message: "a",
      source: "web-admin",
    });
    recordReportedError({
      kind: "server",
      message: "b",
      source: "http",
    });

    expect(listReportedErrors({ kind: "client" })).toHaveLength(1);
    expect(listReportedErrors({ source: "admin" })).toHaveLength(1);
  });

  it("evicts oldest entries when over capacity", () => {
    setReportedErrorBufferCapacityForTests(2);
    recordReportedError({ kind: "client", message: "a", source: "x" });
    recordReportedError({ kind: "client", message: "b", source: "x" });
    recordReportedError({ kind: "client", message: "c", source: "x" });

    const entries = listReportedErrors();
    expect(entries).toHaveLength(2);
    expect(entries[0].message).toBe("b");
    expect(entries[1].message).toBe("c");
  });
});
