/**
 * Cookie-authenticated SSE over `fetch` (`credentials: "include"`).
 *
 * Native `EventSource` does not send cookies on cross-origin requests (e.g.
 * `app.*` → `api.*` on the same site). Product SPAs use subdomain-separated API
 * hosts with session cookies scoped to the registrable domain, so SSE must use
 * fetch like {@link createSafClient}.
 */

export type CredentialsEventSourceHandlers = {
  onOpen?: () => void;
  onError?: () => void;
  onEvent: (type: string, data: string, eventId?: string) => void;
};

export type CredentialsEventSource = {
  close(): void;
};

const DEFAULT_RECONNECT_MS = 3_000;

type ParsedSseFrame = {
  type: string;
  data: string;
  id?: string;
};

function parseSseChunk(
  buffer: string,
  carry: ParsedSseFrame | null,
): { buffer: string; carry: ParsedSseFrame | null; frames: ParsedSseFrame[] } {
  const frames: ParsedSseFrame[] = [];
  let frame = carry ?? { type: "message", data: "" };

  let lineStart = 0;
  while (lineStart <= buffer.length) {
    const lineEnd = buffer.indexOf("\n", lineStart);
    if (lineEnd === -1) {
      break;
    }

    let line = buffer.slice(lineStart, lineEnd);
    lineStart = lineEnd + 1;
    if (line.endsWith("\r")) {
      line = line.slice(0, -1);
    }

    if (line === "") {
      if (frame.data.length > 0) {
        const data = frame.data.endsWith("\n")
          ? frame.data.slice(0, -1)
          : frame.data;
        frames.push({ ...frame, data });
      }
      frame = { type: "message", data: "" };
      continue;
    }

    if (line.startsWith(":")) {
      continue;
    }

    const colon = line.indexOf(":");
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? "" : line.slice(colon + 1);
    if (value.startsWith(" ")) {
      value = value.slice(1);
    }

    switch (field) {
      case "event":
        frame.type = value;
        break;
      case "data":
        frame.data += `${value}\n`;
        break;
      case "id":
        frame.id = value;
        break;
      default:
        break;
    }
  }

  const remainder = buffer.slice(lineStart);
  const incomplete =
    frame.type !== "message" || frame.data.length > 0 || frame.id != null;
  return {
    buffer: remainder,
    carry: incomplete ? frame : null,
    frames,
  };
}

async function readCredentialsEventStream(
  url: string,
  options: {
    signal: AbortSignal;
    lastEventId?: string;
    handlers: CredentialsEventSourceHandlers;
    onLastEventId: (id: string) => void;
  },
): Promise<"ended" | "aborted" | "error"> {
  const headers: Record<string, string> = {
    Accept: "text/event-stream",
  };
  if (options.lastEventId) {
    headers["Last-Event-ID"] = options.lastEventId;
  }

  try {
    const response = await fetch(url, {
      credentials: "include",
      headers,
      signal: options.signal,
    });

    if (!response.ok) {
      return "error";
    }

    options.handlers.onOpen?.();

    const reader = response.body?.getReader();
    if (!reader) {
      return "error";
    }

    const decoder = new TextDecoder();
    let buffer = "";
    let carry: ParsedSseFrame | null = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      const parsed = parseSseChunk(buffer, carry);
      buffer = parsed.buffer;
      carry = parsed.carry;
      for (const frame of parsed.frames) {
        if (frame.id) {
          options.onLastEventId(frame.id);
        }
        options.handlers.onEvent(frame.type, frame.data, frame.id);
      }
    }

    return options.signal.aborted ? "aborted" : "ended";
  } catch {
    return options.signal.aborted ? "aborted" : "error";
  }
}

/**
 * Long-lived SSE subscription with session cookies. Reconnects on drop/errors
 * until {@link CredentialsEventSource.close}.
 */
export function createCredentialsEventSource(
  url: string,
  handlers: CredentialsEventSourceHandlers,
  reconnectMs = DEFAULT_RECONNECT_MS,
): CredentialsEventSource {
  const abort = new AbortController();
  let lastEventId: string | undefined;
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  let running = false;

  const scheduleReconnect = () => {
    if (abort.signal.aborted) {
      return;
    }
    handlers.onError?.();
    reconnectTimer = setTimeout(() => {
      reconnectTimer = undefined;
      connect();
    }, reconnectMs);
  };

  const connect = async () => {
    if (abort.signal.aborted || running) {
      return;
    }
    running = true;
    const result = await readCredentialsEventStream(url, {
      signal: abort.signal,
      lastEventId,
      handlers,
      onLastEventId: (id) => {
        lastEventId = id;
      },
    });
    running = false;

    if (result === "aborted") {
      return;
    }
    if (result === "error") {
      scheduleReconnect();
      return;
    }
    // Server closed stream (max lifetime) — reconnect immediately.
    if (!abort.signal.aborted) {
      handlers.onError?.();
      reconnectTimer = setTimeout(() => {
        reconnectTimer = undefined;
        connect();
      }, 0);
    }
  };

  connect();

  return {
    close() {
      abort.abort();
      if (reconnectTimer != null) {
        clearTimeout(reconnectTimer);
        reconnectTimer = undefined;
      }
    },
  };
}

/** @internal Test helper for SSE line parsing. */
export function parseSseChunkForTests(
  buffer: string,
  carry: ParsedSseFrame | null = null,
) {
  return parseSseChunk(buffer, carry);
}
