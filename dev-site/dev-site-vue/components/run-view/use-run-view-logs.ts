import { computed, nextTick, ref, watch, type Ref } from "vue";
import {
  flattenRunLogPages,
  useWorkflowRunLogsQuery,
} from "../../requests/workflows-queries.ts";
import { groupLogs } from "../../group-logs.ts";
import {
  isLastAgentInputItem,
  isNearScrollBottom,
  lastAgentInputLogId,
  logItemKey,
  logItemStepIndex,
  scrollTopForLogTarget,
  stepIndexAtViewportBottom,
} from "./run-view.logic.ts";

const SCROLL_BOTTOM_THRESHOLD_PX = 32;
const SCROLL_TOP_THRESHOLD_PX = 80;

export function useRunViewLogs(runId: Ref<string | undefined>) {
  const logAnchor = ref<number | undefined>(undefined);
  const logsQuery = useWorkflowRunLogsQuery(runId, logAnchor);
  const logs = computed(() => flattenRunLogPages(logsQuery.data.value?.pages));
  const logItems = computed(() => groupLogs(logs.value));

  const logContainer = ref<HTMLElement | null>(null);
  const isFollowing = ref(true);
  let loadingOlder = false;
  let loadingNewer = false;
  const pendingScrollStep = ref<number | undefined>(undefined);
  const currentStepIndex = ref<number | undefined>(undefined);

  const lastAgentInputId = computed(() => lastAgentInputLogId(logs.value));
  const showStickyAgentInput = computed(
    () => logAnchor.value === undefined && isFollowing.value,
  );

  watch(runId, () => {
    logAnchor.value = undefined;
    pendingScrollStep.value = undefined;
    isFollowing.value = true;
  });

  function scrollLogTo(target: HTMLElement) {
    const el = logContainer.value;
    if (!el) return;
    el.scrollTop = scrollTopForLogTarget(el, target);
  }

  async function attemptPendingStepScroll(): Promise<void> {
    const pending = pendingScrollStep.value;
    const el = logContainer.value;
    if (pending === undefined || !el) return;
    if (logsQuery.isFetching.value || logsQuery.isPending.value) return;

    await nextTick();
    const target = el.querySelector<HTMLElement>(`[data-step-index="${pending}"]`);
    if (target) {
      scrollLogTo(target);
      requestAnimationFrame(() => scrollLogTo(target));
      pendingScrollStep.value = undefined;
      return;
    }
    if (logAnchor.value === pending) {
      pendingScrollStep.value = undefined;
    }
  }

  function scrollToStep(index: number) {
    isFollowing.value = false;
    pendingScrollStep.value = index;
    const sameAnchor = logAnchor.value === index;
    logAnchor.value = index;
    if (sameAnchor) {
      void attemptPendingStepScroll();
    }
  }

  function returnToLiveLogs() {
    logAnchor.value = undefined;
    pendingScrollStep.value = undefined;
    isFollowing.value = true;
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
    async () => {
      await attemptPendingStepScroll();
      const el = logContainer.value;
      if (pendingScrollStep.value === undefined && isFollowing.value && el) {
        await nextTick();
        el.scrollTop = el.scrollHeight;
      }
      updateCurrentStepIndex();
    },
    { flush: "post" },
  );

  watch(
    () => logsQuery.isFetching.value,
    (fetching, wasFetching) => {
      if (wasFetching && !fetching && pendingScrollStep.value !== undefined) {
        void attemptPendingStepScroll();
      }
    },
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
    scrollToStep,
    returnToLiveLogs,
    onScroll,
    logItemStepIndex,
    logItemKey,
    isLastAgentInput,
  };
}
