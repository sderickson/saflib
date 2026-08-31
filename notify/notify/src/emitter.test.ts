import { describe, expect, test, vi } from "vitest";
import {
  InProcessChangeEmitter,
  RING_BUFFER_MAX_AGE_MS,
  RING_BUFFER_MAX_EVENTS,
} from "../index.ts";
import type { ChangeEvent, ChangeEventWithId } from "../index.ts";

function event(
  overrides: Partial<ChangeEvent> & Pick<ChangeEvent, "org_id">,
): ChangeEvent {
  return {
    operation_id: "updateMatter",
    params: { matterId: "m1" },
    ...overrides,
  };
}

describe("InProcessChangeEmitter", () => {
  test("delivers published events to org subscribers", () => {
    const emitter = new InProcessChangeEmitter();
    const received: ChangeEventWithId[] = [];
    emitter.subscribe("org-a", (e) => received.push(e));

    emitter.publish(event({ org_id: "org-a" }));
    emitter.publish(event({ org_id: "org-b", operation_id: "other" }));

    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({
      org_id: "org-a",
      operation_id: "updateMatter",
      params: { matterId: "m1" },
      id: "1",
    });
  });

  test("unsubscribe stops delivery", () => {
    const emitter = new InProcessChangeEmitter();
    const received: ChangeEventWithId[] = [];
    const unsubscribe = emitter.subscribe("org-a", (e) => received.push(e));

    emitter.publish(event({ org_id: "org-a" }));
    unsubscribe();
    emitter.publish(event({ org_id: "org-a", operation_id: "second" }));

    expect(received).toHaveLength(1);
    expect(received[0]!.operation_id).toBe("updateMatter");
  });

  test("getEventsAfter replays buffered events after Last-Event-ID", () => {
    const emitter = new InProcessChangeEmitter();
    emitter.publish(event({ org_id: "org-a", operation_id: "a" }));
    emitter.publish(event({ org_id: "org-a", operation_id: "b" }));
    emitter.publish(event({ org_id: "org-a", operation_id: "c" }));

    const after1 = emitter.getEventsAfter("org-a", "1");
    expect(after1.map((e) => e.operation_id)).toEqual(["b", "c"]);
    expect(after1.map((e) => e.id)).toEqual(["2", "3"]);

    expect(emitter.getEventsAfter("org-a", "3")).toEqual([]);
    expect(emitter.getEventsAfter("org-a", "999")).toEqual([]);
    expect(emitter.getEventsAfter("missing", "1")).toEqual([]);
  });

  test("ring buffer drops oldest when over capacity", () => {
    const emitter = new InProcessChangeEmitter({ maxEventsPerOrg: 3 });
    for (let i = 0; i < 5; i++) {
      emitter.publish(event({ org_id: "org-a", operation_id: `op-${i}` }));
    }

    const replay = emitter.getEventsAfter("org-a", "0");
    expect(replay.map((e) => e.operation_id)).toEqual(["op-2", "op-3", "op-4"]);
    expect(RING_BUFFER_MAX_EVENTS).toBe(50);
  });

  test("ring buffer drops events older than max age", () => {
    let now = 1_000_000;
    const emitter = new InProcessChangeEmitter({
      now: () => now,
      maxEventAgeMs: 1_000,
    });

    emitter.publish(event({ org_id: "org-a", operation_id: "old" }));
    now += 500;
    emitter.publish(event({ org_id: "org-a", operation_id: "mid" }));
    now += 600;
    emitter.publish(event({ org_id: "org-a", operation_id: "new" }));

    const replay = emitter.getEventsAfter("org-a", "0");
    expect(replay.map((e) => e.operation_id)).toEqual(["mid", "new"]);
    expect(RING_BUFFER_MAX_AGE_MS).toBe(5 * 60 * 1000);
  });

  test("isolates buffers and subscribers by orgId", () => {
    const emitter = new InProcessChangeEmitter();
    const a: ChangeEventWithId[] = [];
    const b: ChangeEventWithId[] = [];
    emitter.subscribe("org-a", (e) => a.push(e));
    emitter.subscribe("org-b", (e) => b.push(e));

    emitter.publish(event({ org_id: "org-a" }));
    emitter.publish(event({ org_id: "org-b", operation_id: "b-op" }));

    expect(a).toHaveLength(1);
    expect(b).toHaveLength(1);
    expect(emitter.getEventsAfter("org-a", "0")).toHaveLength(1);
    expect(emitter.getEventsAfter("org-b", "0")).toHaveLength(1);
  });

  test("listener errors do not prevent other subscribers", () => {
    const emitter = new InProcessChangeEmitter();
    const good = vi.fn();
    emitter.subscribe("org-a", () => {
      throw new Error("boom");
    });
    emitter.subscribe("org-a", good);

    expect(() => emitter.publish(event({ org_id: "org-a" }))).not.toThrow();
    expect(good).toHaveBeenCalledOnce();
  });
});
