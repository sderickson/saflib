import { describe, expect, it, vi, afterEach } from "vitest";
import {
  createCredentialsEventSource,
  parseSseChunkForTests,
} from "./eventStream.ts";

describe("parseSseChunkForTests", () => {
  it("parses a single change event frame", () => {
    const chunk =
      "event: change\n" +
      "data: {\"operationId\":\"x\"}\n" +
      "id: evt-1\n\n";
    const { frames, carry, buffer } = parseSseChunkForTests(chunk);
    expect(buffer).toBe("");
    expect(carry).toBeNull();
    expect(frames).toEqual([
      {
        type: "change",
        data: '{"operationId":"x"}',
        id: "evt-1",
      },
    ]);
  });

  it("buffers incomplete frames across chunks", () => {
    const first = parseSseChunkForTests("event: change\n");
    expect(first.frames).toHaveLength(0);
    expect(first.carry?.type).toBe("change");

    const second = parseSseChunkForTests(
      "data: hi\n\n",
      first.carry,
    );
    expect(second.frames).toEqual([
      { type: "change", data: "hi", id: undefined },
    ]);
  });
});

describe("createCredentialsEventSource", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses credentials include and dispatches named events", async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            "event: change\ndata: {\"ok\":true}\n\n",
          ),
        );
        controller.close();
      },
    });

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      body: stream,
    });
    vi.stubGlobal("fetch", fetchMock);

    const onEvent = vi.fn();
    const source = createCredentialsEventSource("https://api.example/orgs/o1/change-events", {
      onEvent,
    });

    await vi.waitFor(() => {
      expect(onEvent).toHaveBeenCalledWith(
        "change",
        '{"ok":true}',
        undefined,
      );
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example/orgs/o1/change-events",
      expect.objectContaining({
        credentials: "include",
        headers: { Accept: "text/event-stream" },
      }),
    );

    source.close();
  });
});
