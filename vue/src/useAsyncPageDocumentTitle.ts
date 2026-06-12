import { toValue, watch, type MaybeRefOrGetter } from "vue";
import { setDocumentTitle } from "./document-title.ts";

/** Set `document.title` from an Async page shell using strings + optional loader data. */
export function useAsyncPageDocumentTitle(
  pageTitle: string,
  detail?: MaybeRefOrGetter<string | null | undefined>,
  appTitle?: string,
): void {
  watch(
    () => {
      const trimmedDetail = detail ? toValue(detail)?.trim() : undefined;
      return trimmedDetail
        ? `${trimmedDetail} — ${pageTitle}`
        : pageTitle;
    },
    (segment) => setDocumentTitle(segment, appTitle),
    { immediate: true },
  );
}
