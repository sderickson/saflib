# Overview

`@saflib/html-sanitizer` removes everything from a piece of HTML except the elements and attributes you allow. It runs anywhere (server or browser) and needs no DOM, so services can sanitize user-provided HTML without loading jsdom.

```ts
import { sanitizeHtml } from "@saflib/html-sanitizer";

const { html, removed } = sanitizeHtml(input, {
  allowedTags: ["p", "a", "b", "i", "ul", "li", "br"],
  allowedAttributes: ["href", "title"],
  // allowedSchemes defaults to ["http", "https", "mailto"]
});
// removed: e.g. [{ tag: "script" }, { tag: "a", attribute: "onclick" }]
```

## How it stays safe without a DOM

DOM-based sanitizers like DOMPurify parse the HTML into a tree and remove what isn't allowed, so they're only as safe as their parser is faithful to the browser's: that's why DOMPurify needs a browser or jsdom, and silently passes HTML through unchanged under lighter DOMs it doesn't support.

This sanitizer instead **rebuilds** its output from the parsed input (via htmlparser2): only allowed element names and attributes are written, attribute values are decoded, checked and re-escaped inside double quotes, and `<` in text is escaped. No markup from the input is copied through, so however a browser would have parsed the input differently, the output can only contain what the policy allows; a parser difference can at most drop or escape some content.

The rest:

- Disallowed elements are removed but their text is kept, except for elements whose content isn't text (`script`, `style`, `iframe`, `svg`, `math`, `template`, `textarea` and similar), which are removed with their content.
- `href`, `src` and `cite` must be relative or use an allowed scheme. Control characters and whitespace are ignored when reading the scheme, as browsers do (`jav&#9;ascript:` is `javascript:`).
- Comments, doctypes and processing instructions are removed.
- Tags aren't balanced: the output closes what the input closed. Closing tags that close nothing are dropped.
- Policies can't allow what the sanitizer can't make safe: those content-dropping elements, `on*` event handlers, `style`, or attributes that hold URLs it doesn't check (`srcset`, `action`, ...). Such a policy throws.

The tests check the output with jsdom and DOMPurify, for known XSS and mutation-XSS payloads and thousands of random mixes of them: a browser-grade parse of the output may only contain allowed elements, attributes and URLs, and DOMPurify, given the same allowlist, must find nothing to remove.

When rendering HTML in the browser, DOMPurify on the real DOM remains a good second line of defense.
