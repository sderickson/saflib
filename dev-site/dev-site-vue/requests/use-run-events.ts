import { watch, onScopeDispose, type MaybeRefOrGetter } from "vue";
import { toValue } from "vue";
import { useQueryClient } from "@tanstack/vue-query";

/**
 * Same-origin SSE (the workflows API is mounted into dev-site-http itself),
 * so a plain `EventSource` is enough here — no need for `node-log-sdk`'s
 * fetch+ReadableStream workaround, which exists specifically for
 * cross-subdomain cookie handling that doesn't apply to this mount.
 * The event payload is a coarse hint only; this just invalidates the
 * queries that re-fetch `/runs/:runId/logs` and the run itself.
 */
export function useRunEvents(runId: MaybeRefOrGetter<string | undefined>): void {
  const queryClient = useQueryClient();
  let source: EventSource | undefined;

  const disconnect = () => {
    source?.close();
    source = undefined;
  };

  watch(
    () => toValue(runId),
    (id) => {
      disconnect();
      if (!id) return;
      source = new EventSource(`/api/runs/${id}/events`);
      source.addEventListener("change", () => {
        queryClient.invalidateQueries({ queryKey: ["new-workflows", "run", id] });
        queryClient.invalidateQueries({ queryKey: ["new-workflows", "run-logs", id] });
      });
    },
    { immediate: true },
  );

  onScopeDispose(disconnect);
}
