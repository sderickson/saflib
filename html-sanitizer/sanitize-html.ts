import { Parser } from "htmlparser2";
import { decodeHTMLAttribute } from "entities";

/**
 * What a sanitizer may keep. Anything not listed is removed: elements are
 * dropped (their text is kept, except for elements like `<script>` whose
 * content is never shown as text), attributes are dropped from the elements
 * that had them.
 */
export interface HtmlSanitizerPolicy {
  /** Element names to keep, e.g. `["p", "a", "b"]`. */
  allowedTags: readonly string[];
  /** Attribute names to keep on any allowed element, e.g. `["href", "title"]`. */
  allowedAttributes: readonly string[];
  /**
   * URL schemes allowed in URL attributes (`href`, `src`, `cite`); relative
   * and protocol-relative URLs are always allowed. Defaults to
   * {@link DEFAULT_ALLOWED_SCHEMES}.
   */
  allowedSchemes?: readonly string[];
}

/**
 * One kind of thing removed. `tag` alone means the element was removed; with
 * `attribute`, only that attribute was removed from the element. Comments are
 * `#comment`, and doctypes and processing instructions are `#declaration`.
 */
export interface HtmlRemoval {
  tag: string;
  attribute?: string;
}

export interface SanitizedHtml {
  /** The sanitized HTML. */
  html: string;
  /** What was removed, deduplicated. Empty when nothing was. */
  removed: HtmlRemoval[];
}

export const DEFAULT_ALLOWED_SCHEMES: readonly string[] = [
  "http",
  "https",
  "mailto",
];

/** Attributes whose value is a URL, checked against the allowed schemes. */
const URL_ATTRIBUTES = new Set(["href", "src", "cite"]);

/**
 * Elements whose content is removed along with them: it's code, styling,
 * embedded documents or foreign (SVG/MathML) markup rather than text, and
 * browsers parse some of it by different rules than the rest of the page.
 */
const DROP_CONTENT_TAGS = new Set([
  "script",
  "style",
  "template",
  "iframe",
  "frame",
  "frameset",
  "object",
  "embed",
  "applet",
  "noscript",
  "noembed",
  "noframes",
  "xmp",
  "plaintext",
  "textarea",
  "title",
  "select",
  "svg",
  "math",
]);

const VOID_TAGS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "source",
  "track",
  "wbr",
]);

const NAME = /^[a-z][a-z0-9-]*$/;

/**
 * Remove everything from `html` that `policy` doesn't allow.
 *
 * The output is rebuilt rather than filtered: it contains only allowed
 * element names and allowed attributes, with every attribute value
 * re-escaped and double-quoted and every `<` in text escaped. So however a
 * browser parses the input differently from this sanitizer's parser
 * (htmlparser2), the output can only contain what the policy allows; the
 * difference can at most drop or escape content. That's what lets it run
 * without a browser-grade DOM. Tags are not balanced: the output closes what
 * the input closed.
 */
export function sanitizeHtml(
  html: string,
  policy: HtmlSanitizerPolicy,
): SanitizedHtml {
  const allowedTags = new Set(policy.allowedTags);
  const allowedAttributes = new Set(policy.allowedAttributes);
  const allowedSchemes = new Set(
    (policy.allowedSchemes ?? DEFAULT_ALLOWED_SCHEMES).map((s) =>
      s.toLowerCase(),
    ),
  );
  assertSafePolicy(allowedTags, allowedAttributes);

  let out = "";
  const removed = new Map<string, HtmlRemoval>();
  const remove = (removal: HtmlRemoval) =>
    removed.set(`${removal.tag}\u0000${removal.attribute ?? ""}`, removal);
  // While inside a drop-content element: its name and nesting depth.
  let dropping: { tag: string; depth: number } | undefined;

  const parser = new Parser(
    {
      onopentag(name, attributes) {
        if (dropping) {
          if (name === dropping.tag) dropping.depth++;
          return;
        }
        if (!allowedTags.has(name)) {
          remove({ tag: name });
          if (DROP_CONTENT_TAGS.has(name) && !VOID_TAGS.has(name)) {
            dropping = { tag: name, depth: 1 };
          }
          return;
        }
        let tag = `<${name}`;
        for (const [attribute, raw] of Object.entries(attributes)) {
          if (!allowedAttributes.has(attribute)) {
            remove({ tag: name, attribute });
            continue;
          }
          const value = decodeHTMLAttribute(raw);
          if (
            URL_ATTRIBUTES.has(attribute) &&
            !isAllowedUrl(value, allowedSchemes)
          ) {
            remove({ tag: name, attribute });
            continue;
          }
          tag += ` ${attribute}="${escapeAttribute(value)}"`;
        }
        const source = html.slice(parser.startIndex, parser.endIndex + 1);
        out +=
          VOID_TAGS.has(name) && source.endsWith("/>")
            ? `${tag} />`
            : `${tag}>`;
      },
      onclosetag(name, isImplied) {
        if (dropping) {
          if (name === dropping.tag && --dropping.depth === 0) {
            dropping = undefined;
          }
          return;
        }
        if (!isImplied && allowedTags.has(name) && !VOID_TAGS.has(name)) {
          out += `</${name}>`;
        }
      },
      ontext(text) {
        if (!dropping) out += text.replaceAll("<", "&lt;");
      },
      oncomment() {
        if (!dropping) remove({ tag: "#comment" });
      },
      onprocessinginstruction() {
        if (!dropping) remove({ tag: "#declaration" });
      },
    },
    // Text passes through with its entities as written; attribute values are
    // decoded here (to check URLs) and re-escaped.
    { decodeEntities: false },
  );
  parser.end(html);

  return { html: out, removed: [...removed.values()] };
}

/**
 * Policies can't allow what this sanitizer can't make safe: elements whose
 * content browsers don't parse as ordinary HTML (their text would need
 * different escaping), event handlers, inline styles, or attributes holding
 * URLs it doesn't check.
 */
function assertSafePolicy(tags: Set<string>, attributes: Set<string>): void {
  for (const tag of tags) {
    if (!NAME.test(tag) || DROP_CONTENT_TAGS.has(tag)) {
      throw new Error(`sanitizeHtml can't allow the <${tag}> element`);
    }
  }
  for (const attribute of attributes) {
    if (
      !NAME.test(attribute) ||
      attribute.startsWith("on") ||
      [
        "style",
        "srcset",
        "action",
        "formaction",
        "poster",
        "background",
        "data",
        "codebase",
        "xmlns",
      ].includes(attribute)
    ) {
      throw new Error(`sanitizeHtml can't allow the ${attribute} attribute`);
    }
  }
}

/**
 * Whether a (decoded) URL is relative or uses an allowed scheme. Browsers
 * ignore control characters and whitespace around and inside a scheme
 * (`jav&#9;ascript:` is `javascript:`), so they're dropped before checking.
 */
function isAllowedUrl(value: string, schemes: Set<string>): boolean {
  // eslint-disable-next-line no-control-regex
  const compact = value.replace(/[\u0000- \u007f-\u009f]/g, "");
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(compact);
  if (scheme) return schemes.has(scheme[1]!.toLowerCase());
  // No scheme: relative. A `:` before any `/`, `?` or `#` would make the
  // browser read a scheme anyway, so refuse it.
  return !/^[^/?#]*:/.test(compact);
}

function escapeAttribute(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
