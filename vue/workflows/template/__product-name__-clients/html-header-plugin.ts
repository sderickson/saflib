// Add scripts, styles, and other tags to the head of all index.html files

import type { HtmlTagDescriptor } from "vite";

export const htmlHeaderPlugin = () => {
  return {
    name: "html-transform",

    transformIndexHtml(_: string) {
      return htmlTagDescriptor;
    },
  };
};

const htmlTagDescriptor: HtmlTagDescriptor[] = [
  {
    tag: "meta",
    attrs: {
      charset: "UTF-8",
    },
    injectTo: "head-prepend",
  },
  {
    tag: "meta",
    attrs: {
      name: "viewport",
      content: "width=device-width, initial-scale=1.0",
    },
    injectTo: "head-prepend",
  },

  {
    tag: "link",
    attrs: {
      rel: "stylesheet",
      href: "https://cdn.jsdelivr.net/npm/@mdi/font@5.x/css/materialdesignicons.min.css",
    },
    injectTo: "head",
  },
  {
    tag: "link",
    attrs: {
      rel: "preconnect",
      href: "https://fonts.googleapis.com",
    },
    injectTo: "head",
  },
  {
    tag: "link",
    attrs: {
      rel: "preconnect",
      href: "https://fonts.gstatic.com",
      crossorigin: true,
    },
    injectTo: "head",
  },
  {
    tag: "link",
    attrs: {
      rel: "stylesheet",
      href: "https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,100..900;1,100..900&display=swap",
    },
    injectTo: "head",
  },

  {
    tag: "link",
    attrs: {
      rel: "icon",
      type: "image/svg+xml",
      href: "/favicon.png",
    },
    injectTo: "head",
  },
];
