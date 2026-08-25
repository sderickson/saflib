import { inject, ref, watch, type InjectionKey } from "vue";
import type { AuditLog } from "@saflib/audit-spec/types";
import { useListAuditLogs } from "@saflib/audit-sdk/requests/list-audit-logs";
import { useSealAuditLog } from "@saflib/audit-sdk/requests/seal-audit-log";
import { getClient } from "@saflib/audit-sdk/client";
import {
  getTanstackErrorMessage,
  handleClientMethod,
  TanstackError,
} from "@saflib/sdk";
import { showError } from "@saflib/vue";
import { audit_log as strings } from "./AuditLog.strings.ts";

const PAGE_SIZE = 50;

export function useAuditLogsLoader() {
  const fromInput = ref("");
  const appliedFrom = ref<string | undefined>(undefined);
  const rows = ref<AuditLog[]>([]);
  const nextCursor = ref<string | null>(null);
  const spanHead = ref<string | null>(null);
  const spanTail = ref<string | null>(null);
  const spanChecked = ref(false);
  const loadMorePending = ref(false);

  const auditLogsQuery = useListAuditLogs({
    from: appliedFrom,
    limit: ref(PAGE_SIZE),
    order: ref("desc"),
  });

  watch(
    () => auditLogsQuery.data.value,
    (data) => {
      if (!data) return;
      rows.value = [...data.auditLogs];
      nextCursor.value = data.nextCursor;
      spanHead.value = data.headAt;
      spanTail.value = data.tailAt;
      spanChecked.value = true;
    },
    { immediate: true },
  );

  function parseFromFilter(): { ok: true; from?: string } | { ok: false } {
    const raw = fromInput.value.trim();
    if (!raw) return { ok: true };
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) {
      showError(strings.invalid_from);
      return { ok: false };
    }
    return { ok: true, from: d.toISOString() };
  }

  function reloadFromStart() {
    const parsed = parseFromFilter();
    if (!parsed.ok) return;
    appliedFrom.value = parsed.from;
    nextCursor.value = null;
  }

  async function loadMore() {
    if (!nextCursor.value || loadMorePending.value) return;
    loadMorePending.value = true;
    try {
      const client = getClient();
      const data = await handleClientMethod(
        client.GET("/audit-logs", {
          params: {
            query: {
              ...(appliedFrom.value ? { from: appliedFrom.value } : {}),
              cursor: nextCursor.value,
              limit: PAGE_SIZE,
              order: "desc",
            },
          },
        }),
      );
      rows.value = rows.value.concat(data.auditLogs);
      nextCursor.value = data.nextCursor;
      spanHead.value = data.headAt;
      spanTail.value = data.tailAt;
    } catch (e: unknown) {
      const message =
        e instanceof TanstackError
          ? getTanstackErrorMessage(e)
          : e instanceof Error
            ? e.message
            : String(e ?? "Unknown error");
      showError(message);
    } finally {
      loadMorePending.value = false;
    }
  }

  const sealMutation = useSealAuditLog();

  return {
    fromInput,
    rows,
    nextCursor,
    spanHead,
    spanTail,
    spanChecked,
    auditLogsQuery,
    loadMorePending,
    reloadFromStart,
    loadMore,
    sealMutation,
  };
}

export type AuditLogsLoader = ReturnType<typeof useAuditLogsLoader>;

export const auditLogsLoaderKey: InjectionKey<AuditLogsLoader> =
  Symbol("auditLogsLoader");

export function useAuditLogsPageLoader(): AuditLogsLoader {
  return inject(auditLogsLoaderKey, null) ?? useAuditLogsLoader();
}
