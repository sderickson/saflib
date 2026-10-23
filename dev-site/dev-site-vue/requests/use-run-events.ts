import { watch, onScopeDispose, type MaybeRefOrGetter } from "vue";
import { toValue } from "vue";
import { useQueryClient } from "@tanstack/vue-query";
import { prependNewerRunLogs } from "./workflows-queries.ts";

/** `EventSource.CLOSED` — spelled out because test stubs don't define the static. */
const EVENT_SOURCE_CLOSED = 2;
const RECONNECT_BASE_MS = 500;
const RECONNECT_MAX_MS = 30_000;
/** The run's own row, messages and newest logs refresh at most this often. */
const RUN_REFRESH_MS = 500;
/**
 * Every plan file's run list refreshes at most this often. A change event
 * fires per log line, and the plans view holds a list query per plan file
 * (dozens), so refetching them all per event flooded the browser's six
 * connections to the dev-site and queued the next advance behind them.
 */
const RUN_LISTS_REFRESH_MS = 5_000;

/**
 * Same-origin SSE (the workflows API is mounted into dev-site-http itself),
 * so a plain `EventSource` is enough here — no need for `node-log-sdk`'s
 * fetch+ReadableStream workaround, which exists specifically for
 * cross-subdomain cookie handling that doesn't apply to this mount.
 * The event payload is a coarse hint only; this invalidates the run row
 * and merges any logs newer than the current tip onto page 0.
 *
 * Reconnects on its own when the browser gives up: `EventSource` only
 * retries by itself while the server keeps answering with an event
 * stream — one non-stream response (e.g. the proxy's 502 while the
 * dev-site restarts) closes it for good, and the page silently stopped
 * getting live logs until a reload. Every re-open also catches up on
 * whatever changed while disconnected.
 */
export function useRunEvents(runId: MaybeRefOrGetter<string | undefined>): void {
  const queryClient = useQueryClient();
  let source: EventSource | undefined;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let failures = 0;

  const refreshRun = throttle((id: string) => {
    queryClient.invalidateQueries({ queryKey: ["new-workflows", "run", id] });
    // Cheap, and a new direct message should show in the sidebar as it starts.
    queryClient.invalidateQueries({ queryKey: ["new-workflows", "run-messages", id] });
    void prependNewerRunLogs(queryClient, id);
  }, RUN_REFRESH_MS);
  const refreshRunLists = throttle(() => {
    queryClient.invalidateQueries({ queryKey: ["new-workflows", "workflow-runs"] });
  }, RUN_LISTS_REFRESH_MS);
  const refresh = (id: string) => {
    refreshRun(id);
    refreshRunLists(undefined);
  };

  const disconnect = () => {
    refreshRun.cancel();
    refreshRunLists.cancel();
    clearTimeout(retryTimer);
    retryTimer = undefined;
    source?.close();
    source = undefined;
  };

  const connect = (id: string, isReconnect: boolean) => {
    const es = new EventSource(`/api/runs/${id}/events`);
    source = es;
    let hasOpened = false;
    es.addEventListener("open", () => {
      failures = 0;
      // The browser's own retries re-fire `open` too; any of those, or a
      // fresh reconnect below, may have missed events in between.
      if (hasOpened || isReconnect) refresh(id);
      hasOpened = true;
    });
    es.addEventListener("change", () => refresh(id));
    es.addEventListener("error", () => {
      if (source !== es || es.readyState !== EVENT_SOURCE_CLOSED) return;
      es.close();
      source = undefined;
      const delay = Math.min(RECONNECT_MAX_MS, RECONNECT_BASE_MS * 2 ** failures++);
      retryTimer = setTimeout(() => {
        retryTimer = undefined;
        if (toValue(runId) === id) connect(id, true);
      }, delay);
    });
  };

  watch(
    () => toValue(runId),
    (id) => {
      disconnect();
      failures = 0;
      if (id) connect(id, false);
    },
    { immediate: true },
  );

  onScopeDispose(disconnect);
}

/**
 * Calls `fn` right away, then at most once per `ms`: calls in between
 * collapse into one trailing call with the latest argument, so the last
 * change is never dropped.
 */
function throttle<T>(fn: (arg: T) => void, ms: number) {
  let last = -Infinity;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending: { arg: T } | undefined;
  const run = (arg: T) => {
    last = Date.now();
    fn(arg);
  };
  const call = (arg: T) => {
    const wait = last + ms - Date.now();
    if (wait <= 0 && !timer) {
      run(arg);
      return;
    }
    pending = { arg };
    timer ??= setTimeout(() => {
      timer = undefined;
      const next = pending!;
      pending = undefined;
      run(next.arg);
    }, Math.max(0, wait));
  };
  call.cancel = () => {
    clearTimeout(timer);
    timer = undefined;
    pending = undefined;
  };
  return call;
}
