import {
  RING_BUFFER_MAX_AGE_MS,
  RING_BUFFER_MAX_EVENTS,
} from "./constants.ts";
import type {
  ChangeEmitter,
  ChangeEvent,
  ChangeEventListener,
  ChangeEventWithId,
} from "./types.ts";

export interface InProcessChangeEmitterOptions {
  /** Max events retained per channel (default {@link RING_BUFFER_MAX_EVENTS}). */
  maxEventsPerChannel?: number;
  /** Drop buffered events older than this (default {@link RING_BUFFER_MAX_AGE_MS}). */
  maxEventAgeMs?: number;
  /** Clock for expiry; inject in tests. */
  now?: () => number;
}

interface BufferedEntry {
  event: ChangeEventWithId;
  createdAt: number;
}

/**
 * Single-process ChangeEmitter with per-channel subscribers and a small
 * ring buffer for Last-Event-ID reconnect replay.
 */
export class InProcessChangeEmitter implements ChangeEmitter {
  readonly #maxEventsPerChannel: number;
  readonly #maxEventAgeMs: number;
  readonly #now: () => number;
  #nextId = 1;
  readonly #subscribers = new Map<string, Set<ChangeEventListener>>();
  readonly #buffers = new Map<string, BufferedEntry[]>();

  constructor(options: InProcessChangeEmitterOptions = {}) {
    this.#maxEventsPerChannel = options.maxEventsPerChannel ?? RING_BUFFER_MAX_EVENTS;
    this.#maxEventAgeMs = options.maxEventAgeMs ?? RING_BUFFER_MAX_AGE_MS;
    this.#now = options.now ?? Date.now;
  }

  publish(event: ChangeEvent): void {
    const withId: ChangeEventWithId = {
      ...event,
      id: String(this.#nextId++),
    };
    const createdAt = this.#now();
    this.#append(event.channel_id, { event: withId, createdAt });
    const listeners = this.#subscribers.get(event.channel_id);
    if (!listeners) {
      return;
    }
    for (const listener of listeners) {
      try {
        listener(withId);
      } catch {
        // Isolate subscriber failures so one bad SSE client cannot block peers.
      }
    }
  }

  subscribe(channelId: string, listener: ChangeEventListener): () => void {
    let listeners = this.#subscribers.get(channelId);
    if (!listeners) {
      listeners = new Set();
      this.#subscribers.set(channelId, listeners);
    }
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) {
        this.#subscribers.delete(channelId);
      }
    };
  }

  getEventsAfter(channelId: string, lastEventId: string): ChangeEventWithId[] {
    this.#prune(channelId);
    const buffer = this.#buffers.get(channelId);
    if (!buffer || buffer.length === 0) {
      return [];
    }
    const lastIdNum = Number(lastEventId);
    if (!Number.isFinite(lastIdNum)) {
      return [];
    }
    return buffer
      .filter((entry) => Number(entry.event.id) > lastIdNum)
      .map((entry) => entry.event);
  }

  #append(channelId: string, entry: BufferedEntry): void {
    let buffer = this.#buffers.get(channelId);
    if (!buffer) {
      buffer = [];
      this.#buffers.set(channelId, buffer);
    }
    buffer.push(entry);
    this.#prune(channelId);
  }

  #prune(channelId: string): void {
    const buffer = this.#buffers.get(channelId);
    if (!buffer) {
      return;
    }
    const cutoff = this.#now() - this.#maxEventAgeMs;
    let start = 0;
    while (start < buffer.length && buffer[start]!.createdAt < cutoff) {
      start++;
    }
    if (start > 0) {
      buffer.splice(0, start);
    }
    const overflow = buffer.length - this.#maxEventsPerChannel;
    if (overflow > 0) {
      buffer.splice(0, overflow);
    }
    if (buffer.length === 0) {
      this.#buffers.delete(channelId);
    }
  }
}
