**@saflib/notify**

---

# @saflib/notify

## Classes

| Class                                                       | Description                                                                                                       |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| [InProcessChangeEmitter](classes/InProcessChangeEmitter.md) | Single-process ChangeEmitter with per-org subscribers and a small ring buffer for Last-Event-ID reconnect replay. |

## Interfaces

| Interface                                                                    | Description                                                                                                                          |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| [ChangeEmitter](interfaces/ChangeEmitter.md)                                 | Transport-agnostic change bus. In-process today; later Redis/NATS or HTTP. Never import product-specific types into implementations. |
| [ChangeEvent](interfaces/ChangeEvent.md)                                     | Published in-process and on the SSE wire (JSON in the `data:` field). Coarse change hint only — no resource bodies.                  |
| [ChangeEventWithId](interfaces/ChangeEventWithId.md)                         | Change event plus monotonic id for SSE `id:` / Last-Event-ID replay.                                                                 |
| [InProcessChangeEmitterOptions](interfaces/InProcessChangeEmitterOptions.md) | -                                                                                                                                    |
| [SseWritable](interfaces/SseWritable.md)                                     | Minimal writable surface (Express `Response`, Node streams, test buffers).                                                           |
| [WriteSseEventOptions](interfaces/WriteSseEventOptions.md)                   | -                                                                                                                                    |

## Type Aliases

| Type Alias                                                 | Description |
| ---------------------------------------------------------- | ----------- |
| [ChangeEventListener](type-aliases/ChangeEventListener.md) | -           |

## Variables

| Variable                                                               | Description                                                           |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------- |
| [RING\_BUFFER\_MAX\_AGE\_MS](variables/RING_BUFFER_MAX_AGE_MS.md)      | Default max age for buffered events (~5 minutes).                     |
| [RING\_BUFFER\_MAX\_EVENTS](variables/RING_BUFFER_MAX_EVENTS.md)       | Default per-org ring buffer capacity (~50 events).                    |
| [SSE\_HEARTBEAT\_INTERVAL\_MS](variables/SSE_HEARTBEAT_INTERVAL_MS.md) | Optional SSE comment heartbeat interval (~30 seconds).                |
| [SSE\_MAX\_CONNECTION\_MS](variables/SSE_MAX_CONNECTION_MS.md)         | Server closes SSE connections after this duration; client reconnects. |

## Functions

| Function                                            | Description                                                                                                                                                                                        |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [validateSseOrigin](functions/validateSseOrigin.md) | CSRF-style check for cookie-authenticated long-lived GET (EventSource). Missing/empty Origin is allowed (non-browser clients). When Origin is present it must match an allowed app origin exactly. |
| [writeSseComment](functions/writeSseComment.md)     | Write an SSE comment line (useful as a keepalive heartbeat). Format: `: <comment>\n\n`                                                                                                             |
| [writeSseEvent](functions/writeSseEvent.md)         | Write one SSE event frame. Ends with a blank line per the SSE framing rules.                                                                                                                       |
