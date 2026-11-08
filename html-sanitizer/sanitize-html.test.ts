import { describe, expect, it } from "vitest";
import { JSDOM } from "jsdom";
import createDOMPurify, { type WindowLike } from "dompurify";
import { sanitizeHtml, type HtmlSanitizerPolicy } from "./sanitize-html.ts";

const policy: HtmlSanitizerPolicy = {
  allowedTags: [
    "p",
    "br",
    "hr",
    "b",
    "i",
    "em",
    "strong",
    "a",
    "img",
    "ul",
    "li",
    "table",
    "tbody",
    "tr",
    "td",
    "code",
    "pre",
    "blockquote",
  ],
  allowedAttributes: ["href", "src", "alt", "title", "align"],
};

const sanitize = (html: string) => sanitizeHtml(html, policy);

describe("sanitizeHtml", () => {
  it("keeps allowed markup as written", () => {
    const html =
      '<p>Mix <b>well</b> &amp; <a href="https://example.com/a?b=1" title="t">see</a></p><br />';
    expect(sanitize(html)).toEqual({
      html,
      removed: [],
    });
  });

  it("drops disallowed elements but keeps their text", () => {
    expect(sanitize('<p>a <span class="x">b</span> c</p>')).toEqual({
      html: "<p>a b c</p>",
      removed: [{ tag: "span" }],
    });
  });

  it("drops script, style and similar elements with their content", () => {
    expect(
      sanitize(
        "a<script>alert(1)</script>b<style>p{}</style>c<svg><text>d</text></svg>e",
      ),
    ).toEqual({
      html: "abce",
      removed: [{ tag: "script" }, { tag: "style" }, { tag: "svg" }],
    });
  });

  it("drops disallowed attributes", () => {
    expect(sanitize('<img src="x.png" onerror="alert(1)" alt="x">')).toEqual({
      html: '<img src="x.png" alt="x">',
      removed: [{ tag: "img", attribute: "onerror" }],
    });
  });

  it.each([
    "javascript:alert(1)",
    "JaVaScRiPt:alert(1)",
    " javascript:alert(1)",
    "jav&#x09;ascript:alert(1)",
    "jav\nascript:alert(1)",
    "&#106;&#97;&#118;&#97;&#115;&#99;&#114;&#105;&#112;&#116;&#58;alert(1)",
    "&#0000106avascript:alert(1)",
    "javascript&colon;alert(1)",
    "\u0001javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox(1)",
    "1nvalid:scheme",
  ])("drops href=%j", (href) => {
    expect(sanitize(`<a href="${href}">x</a>`)).toEqual({
      html: "<a>x</a>",
      removed: [{ tag: "a", attribute: "href" }],
    });
  });

  it.each([
    "https://example.com",
    "http://example.com",
    "mailto:a@example.com",
    "/relative/path",
    "relative/path?q=a:b",
    "#anchor",
    "//example.com/x.png",
  ])("keeps href=%j", (href) => {
    expect(sanitize(`<a href="${href}">x</a>`).removed).toEqual([]);
  });

  it("re-escapes attribute values", () => {
    expect(
      sanitize(`<a title='"><img src=x onerror=alert(1)>'>q</a>`).html,
    ).toBe('<a title="&quot;&gt;&lt;img src=x onerror=alert(1)&gt;">q</a>');
  });

  it("escapes < in text, so it can't start markup elsewhere", () => {
    expect(sanitize("a < b <3").html).toBe("a &lt; b &lt;3");
  });

  it("removes comments and declarations", () => {
    expect(sanitize("a<!-- hidden -->b<!DOCTYPE html>c")).toEqual({
      html: "abc",
      removed: [{ tag: "#comment" }, { tag: "#declaration" }],
    });
  });

  it("doesn't balance tags", () => {
    expect(sanitize('<a href="/x">').html).toBe('<a href="/x">');
    expect(sanitize("<p>one<p>two").html).toBe("<p>one<p>two");
    // The parser drops closing tags that close nothing.
    expect(sanitize("a</b>").html).toBe("a");
  });

  it("reports each removal once", () => {
    expect(sanitize("<font>a</font><font>b</font>").removed).toEqual([
      { tag: "font" },
    ]);
  });

  it("refuses policies it can't make safe", () => {
    expect(() =>
      sanitizeHtml("", { allowedTags: ["script"], allowedAttributes: [] }),
    ).toThrow();
    expect(() =>
      sanitizeHtml("", { allowedTags: ["svg"], allowedAttributes: [] }),
    ).toThrow();
    expect(() =>
      sanitizeHtml("", { allowedTags: ["p"], allowedAttributes: ["onclick"] }),
    ).toThrow();
    expect(() =>
      sanitizeHtml("", { allowedTags: ["p"], allowedAttributes: ["style"] }),
    ).toThrow();
  });
});

/**
 * The output, parsed by a browser-grade parser (jsdom), may only contain
 * allowed elements and attributes with allowed URLs, and DOMPurify, given
 * the same allowlist, finds nothing to remove from it.
 */
describe("sanitizeHtml output, checked by jsdom and DOMPurify", () => {
  const window = new JSDOM("", { url: "https://example.test/" }).window;
  const purify = createDOMPurify(window as unknown as WindowLike);
  const allowedTags = new Set(policy.allowedTags);
  const allowedAttributes = new Set(policy.allowedAttributes);

  const check = (input: string) => {
    const { html } = sanitize(input);
    const template = window.document.createElement("template");
    template.innerHTML = html;
    for (const element of template.content.querySelectorAll("*")) {
      const name = element.localName;
      expect(allowedTags.has(name), `<${name}> from ${input}`).toBe(true);
      for (const { name: attribute, value } of element.attributes) {
        expect(
          allowedAttributes.has(attribute),
          `${attribute} from ${input}`,
        ).toBe(true);
        if (attribute === "href" || attribute === "src") {
          expect(
            /^\s*(https?:|mailto:|[^:]*$|[^:]*[/?#])/i.test(value),
            `${attribute}="${value}" from ${input}`,
          ).toBe(true);
        }
      }
    }
    purify.sanitize(html, {
      ALLOWED_TAGS: [...policy.allowedTags],
      ALLOWED_ATTR: [...policy.allowedAttributes],
    });
    // DOMPurify reports the document wrapper it parses into; that's not ours.
    const removed = purify.removed.filter(
      (entry) =>
        !("element" in entry) ||
        !["html", "head", "body"].includes(
          entry.element.nodeName.toLowerCase(),
        ),
    );
    expect(removed, `DOMPurify removed from ${html} (from ${input})`).toEqual(
      [],
    );
  };

  // XSS and mutation-XSS payloads from public cheat sheets, plus parser
  // edge cases.
  const payloads = [
    "<img src=x onerror=alert(1)>",
    "<svg><script>alert(1)</script></svg>",
    "<svg onload=alert(1)>",
    '<a href="javascript:alert(1)">x</a>',
    '<a href="jav&#x09;ascript:alert(1)">x</a>',
    '<img src="x" alt="y"/onerror=alert(1)>',
    "<img/src=x/onerror=alert(1)>",
    '<iframe src="javascript:alert(1)"></iframe>',
    "<math><mtext><table><mglyph><style><img src=x onerror=alert(1)>",
    '<noscript><p title="</noscript><img src=x onerror=alert(1)>">',
    '<xmp><p title="</xmp><img src=x onerror=alert(1)>">',
    "<!--<img src=x onerror=alert(1)>-->",
    "<!--x--!><img src=x onerror=alert(1)>",
    "<!--x--><img src=x onerror=alert(1)>",
    "<style><img src=x onerror=alert(1)></style>",
    "<textarea><img src=x onerror=alert(1)></textarea>",
    "<title><img src=x onerror=alert(1)></title>",
    "<form><math><mtext></form><form><mglyph><style></math><img src onerror=alert(1)>",
    '<a href="x" title="&quot;><img src=x onerror=alert(1)>">ok</a>',
    "<p title=`x`onclick=alert(1)>",
    "<img src=x onerror=alert(1)//",
    "<b <img src=x onerror=alert(1)>>",
    "<scr<script>ipt>alert(1)</script>",
    "<</p>img src=x onerror=alert(1)>",
    "</ img src=x onerror=alert(1)>",
    '<table><td><a href="https://x">c</a>',
    '<IMG SRC="jav&#x0D;ascript:alert(1)">',
    '<object data="javascript:alert(1)">',
    '<embed src="javascript:alert(1)">',
    '<base href="javascript:/">',
    '<meta http-equiv="refresh" content="0;url=javascript:alert(1)">',
    "<details open ontoggle=alert(1)>",
    "<a\u0000 onclick=alert(1)>x</a>",
    '<a href="https://ok" onclick="x" ONCLICK=y>a</a>',
    "<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>",
    "<template><img src=x onerror=alert(1)></template>",
    "<select><option><img src=x onerror=alert(1)></option></select>",
    "<plaintext><img src=x onerror=alert(1)>",
    "<a href='&#x6A;avascript:alert(1)'>x</a>",
    "<img src='x' title=\"a'b\" alt='c\"d'>",
    "<pre><code>&lt;b&gt;</code></pre><br/><hr />",
  ];

  it.each(payloads)("%s", check);

  it("holds for random mixes of the payloads", () => {
    // Deterministic pseudo-random splices of payload fragments.
    let seed = 1;
    const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const pieces = payloads.flatMap((p) => p.split(/(?=[<>"'=/ ])/));
    for (let i = 0; i < 2000; i++) {
      let input = "";
      const n = 2 + Math.floor(random() * 8);
      for (let j = 0; j < n; j++) {
        input += pieces[Math.floor(random() * pieces.length)];
      }
      check(input);
    }
  });
});
