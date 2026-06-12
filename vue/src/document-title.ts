export const DEFAULT_APP_DOCUMENT_TITLE = "App";

let appDocumentTitle = DEFAULT_APP_DOCUMENT_TITLE;

/** Set the app name appended to page titles, e.g. `Home — CaseDaemon`. */
export function configureAppDocumentTitle(title: string): void {
  const trimmed = title.trim();
  appDocumentTitle = trimmed.length > 0 ? trimmed : DEFAULT_APP_DOCUMENT_TITLE;
}

export function getAppDocumentTitle(): string {
  return appDocumentTitle;
}

export function formatDocumentTitle(
  segment: string | null | undefined,
  appTitle: string = appDocumentTitle,
): string {
  const trimmedSegment = segment?.trim();
  const trimmedAppTitle = appTitle.trim() || DEFAULT_APP_DOCUMENT_TITLE;
  return trimmedSegment
    ? `${trimmedSegment} — ${trimmedAppTitle}`
    : trimmedAppTitle;
}

export function setDocumentTitle(
  segment: string | null | undefined,
  appTitle?: string,
): void {
  if (typeof document === "undefined") {
    return;
  }
  document.title = formatDocumentTitle(segment, appTitle);
}
