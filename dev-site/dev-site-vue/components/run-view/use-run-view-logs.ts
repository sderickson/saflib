import { computed, nextTick, ref, watch, type Ref } from "vue";
import {
  flattenRunLogPages,
  useWorkflowRunLogsQuery,
  type LogAnchor,
} from "../../requests/workflows-queries.ts";
import { groupLogs } from "../../group-logs.ts";
import {
  isLastAgentInputItem,
  isNearScrollBottom,
  lastAgentInputLogId,
  logItemKey,
  logItemSeq,
  logItemStepIndex,
  scrollTopForLogTarget,
  stepIndexAtViewportBottom,
} from "./run-view.logic.ts";

const SCROLL_BOTTOM_THRESHOLD_PX = 32;
const SCROLL_TOP_THRESHOLD_PX = 80;

export function useRunViewLogs(runId: Ref<string | undefined>) {
  const logAnchor = ref<LogAnchor | undefined>(undefined);
  const logsQuery = useWorkflowRunLogsQuery(runId, logAnchor);
  const logs = computed(() => flattenRunLogPages(logsQuery.data.value?.pages));
  const logItems = computed(() => groupLogs(logs.value));

  const logContainer = ref<HTMLElement | null>(null);
  const isFollowing = ref(true);
  let loadingOlder = false;
  let loadingNewer = false;
  /** Bumped on every jump/return so a superseded jump doesn't scroll. */
  let navToken = 0;
  const currentStepIndex = ref<number | undefined>(undefined);

  const lastAgentInputId = computed(() => lastAgentInputLogId(logs.value));
  const showStickyAgentInput = computed(
    () => logAnchor.value === undefined && isFollowing.value,
  );
  // Anchored windows don't receive SSE tip merges, so they count as "not live"
  // even when scrolled to their end.
  const showJumpToLatest = computed(
    () => logAnchor.value !== undefined || !isFollowing.value,
  );

  watch(runId, () => {
    navToken++;
    logAnchor.value = undefined;
    isFollowing.value = true;
  });

  function scrollLogTo(target: HTMLElement) {
    const el = logContainer.value;
    if (!el) return;
    el.scrollTop = scrollTopForLogTarget(el, target);
  }

  /** Resolves once the query for the current key has no fetch in flight. */
  function logsSettled(): Promise<void> {
    return new Promise((resolve) => {
      const stop = watch(
        () => logsQuery.isFetching.value,
        (fetching) => {
          if (fetching) return;
          queueMicrotask(() => stop());
          resolve();
        },
        { immediate: true },
      );
    });
  }

  /**
   * Sidebar jump: re-key the logs query to a window starting at `anchor`
   * (a step's first row, or one specific row such as a direct message),
   * wait for that window to load and render, then scroll its first row to
   * the top.
   */
  async function jumpTo(anchor: LogAnchor) {
    const token = ++navToken;
    isFollowing.value = false;
    logAnchor.value = anchor;
    // Let vue-query pick up the new key before checking fetch state.
    await nextTick();
    await logsSettled();
    await nextTick();
    if (token !== navToken) return;

    const selector =
      "step" in anchor ? `[data-step-index="${anchor.step}"]` : `[data-seq="${anchor.seq}"]`;
    const target = logContainer.value?.querySelector<HTMLElement>(selector);
    if (!target) return;
    scrollLogTo(target);
    // Cards can grow after first paint (markdown, code blocks); re-pin once.
    requestAnimationFrame(() => {
      if (token === navToken) scrollLogTo(target);
    });
    updateCurrentStepIndex();
  }

  const scrollToStep = (index: number) => jumpTo({ step: index });
  const scrollToMessage = (seq: number) => jumpTo({ seq });

  /** Back to the live tip, pinned to the bottom. */
  async function returnToLiveLogs() {
    const token = ++navToken;
    logAnchor.value = undefined;
    isFollowing.value = true;
    await nextTick();
    await logsSettled();
    await nextTick();
    const el = logContainer.value;
    if (token !== navToken || !el) return;
    el.scrollTop = el.scrollHeight;
    updateCurrentStepIndex();
  }

  function updateCurrentStepIndex() {
    const el = logContainer.value;
    if (!el) return;
    currentStepIndex.value = stepIndexAtViewportBottom(el);
  }

  async function loadOlderLogsIfNeeded(el: HTMLElement) {
    if (
      loadingOlder ||
      el.scrollTop > SCROLL_TOP_THRESHOLD_PX ||
      !logsQuery.hasNextPage.value ||
      logsQuery.isFetchingNextPage.value
    ) {
      return;
    }
    loadingOlder = true;
    const prevHeight = el.scrollHeight;
    const prevTop = el.scrollTop;
    try {
      await logsQuery.fetchNextPage();
      await nextTick();
      el.scrollTop = prevTop + (el.scrollHeight - prevHeight);
    } finally {
      loadingOlder = false;
    }
  }

  async function loadNewerLogsIfNeeded(el: HTMLElement) {
    if (
      loadingNewer ||
      !isNearScrollBottom(el, SCROLL_BOTTOM_THRESHOLD_PX) ||
      !logsQuery.hasPreviousPage.value ||
      logsQuery.isFetchingPreviousPage.value
    ) {
      return;
    }
    loadingNewer = true;
    try {
      await logsQuery.fetchPreviousPage();
    } finally {
      loadingNewer = false;
    }
  }

  function onScroll() {
    const el = logContainer.value;
    if (el) {
      isFollowing.value =
        !logsQuery.hasPreviousPage.value &&
        isNearScrollBottom(el, SCROLL_BOTTOM_THRESHOLD_PX);
      void loadOlderLogsIfNeeded(el);
      void loadNewerLogsIfNeeded(el);
    }
    updateCurrentStepIndex();
  }

  watch(
    logItems,
    () => {
      const el = logContainer.value;
      if (isFollowing.value && el) el.scrollTop = el.scrollHeight;
      updateCurrentStepIndex();
    },
    { flush: "post" },
  );

  function isLastAgentInput(item: ReturnType<typeof groupLogs>[number]) {
    return isLastAgentInputItem(item, lastAgentInputId.value);
  }

  return {
    logAnchor,
    logsQuery,
    logs,
    logContainer,
    logItems,
    currentStepIndex,
    showStickyAgentInput,
    showJumpToLatest,
    scrollToStep,
    scrollToMessage,
    returnToLiveLogs,
    onScroll,
    logItemStepIndex,
    logItemKey,
    logItemSeq,
    isLastAgentInput,
  };
}
