import { describe, it, expect, beforeEach } from "vitest";
import {
  listProductEvents,
  recordProductEvent,
  resetProductEventBufferForTests,
  setProductEventBufferCapacityForTests,
} from "./productEventBuffer.ts";

describe("productEventBuffer", () => {
  beforeEach(() => {
    resetProductEventBufferForTests();
  });

  it("records client and server events in one buffer", () => {
    recordProductEvent({ event: "login", context: { method: "email" } }, "client");
    recordProductEvent({ event: "cron_tick" }, "server");

    const events = listProductEvents();
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({
      id: 1,
      name: "login",
      source: "client",
      payload: { event: "login", context: { method: "email" } },
    });
    expect(events[1]).toMatchObject({
      id: 2,
      name: "cron_tick",
      source: "server",
    });
  });

  it("keeps the last N entries", () => {
    setProductEventBufferCapacityForTests(2);
    recordProductEvent({ event: "a" }, "client");
    recordProductEvent({ event: "b" }, "client");
    recordProductEvent({ event: "c" }, "server");

    expect(listProductEvents().map((entry) => entry.name)).toEqual(["b", "c"]);
  });

  it("filters by name and limit", () => {
    recordProductEvent({ event: "login" }, "client");
    recordProductEvent({ event: "signup" }, "client");
    recordProductEvent({ event: "login" }, "server");

    expect(listProductEvents({ name: "login" }).map((entry) => entry.source)).toEqual([
      "client",
      "server",
    ]);
    expect(listProductEvents({ limit: 1 }).map((entry) => entry.name)).toEqual([
      "login",
    ]);
  });
});
