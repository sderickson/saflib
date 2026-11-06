/**
 * `@saflib/html-sanitizer`: an allowlist HTML sanitizer that rebuilds its
 * output instead of filtering a DOM, so it needs no browser or jsdom. See
 * {@link sanitizeHtml}.
 */
export {
  sanitizeHtml,
  DEFAULT_ALLOWED_SCHEMES,
  type HtmlSanitizerPolicy,
  type HtmlRemoval,
  type SanitizedHtml,
} from "./sanitize-html.ts";
