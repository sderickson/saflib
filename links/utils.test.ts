import {
  constructPath,
  getHost,
  linkToProps,
  setClientName,
} from "./utils.ts";
import { describe, it, expect, beforeEach } from "vitest";
import { linkToHref } from "./index.ts";
import { typedEnv } from "@saflib/env";

beforeEach(() => {
  globalThis.document = {
    location: {
      hostname: "test.docker.localhost",
      host: "test.docker.localhost",
      protocol: "http:",
    },
  } as unknown as Document;
  setClientName("test");
});

describe("constructPath", () => {
  it("returns path unchanged when no options", () => {
    expect(constructPath({ subdomain: "app", path: "/c/:collectionId/recipes" })).toBe(
      "/c/:collectionId/recipes",
    );
  });

  it("replaces URL params in path (e.g. :collectionId)", () => {
    expect(
      constructPath(
        { subdomain: "app", path: "/c/:collectionId/recipes/list" },
        { params: { collectionId: "my-kitchen" } },
      ),
    ).toBe("/c/my-kitchen/recipes/list");
  });

  it("replaces multiple URL params in path", () => {
    expect(
      constructPath(
        { subdomain: "app", path: "/c/:collectionId/recipes/:id" },
        { params: { collectionId: "c1", id: "r1" } },
      ),
    ).toBe("/c/c1/recipes/r1");
  });

  it("adds query params when param is not in path", () => {
    expect(
      constructPath(
        { subdomain: "app", path: "/", params: ["a", "b"] },
        { params: { a: "1", b: "2" } },
      ),
    ).toBe("/?a=1&b=2");
  });

  it("replaces URL params and adds remaining as query params", () => {
    expect(
      constructPath(
        { subdomain: "app", path: "/c/:collectionId/recipes", params: ["sort"] },
        { params: { collectionId: "c1", sort: "title" } },
      ),
    ).toBe("/c/c1/recipes?sort=title");
  });

  it("throws if param is neither in path nor in link.params", () => {
    expect(() =>
      constructPath(
        { subdomain: "app", path: "/c/:collectionId/recipes" },
        { params: { collectionId: "c1", unknown: "x" } },
      ),
    ).toThrow('Param unknown not found in link /c/:collectionId/recipes');
  });
});

describe("linkToProps", () => {
  it("returns href for links to other subdomains, and to for links to the same subdomain", () => {
    process.env.DOMAIN = "docker.localhost";
    process.env.PROTOCOL = "http";
    setClientName("subdomain-a");
    expect(linkToProps({ subdomain: "subdomain-a", path: "/" })).toEqual({
      to: "/",
    });
    expect(linkToProps({ subdomain: "subdomain-b", path: "/" })).toEqual({
      href: `http://subdomain-b.localhost:3000/`,
    });
  });

  it("adds query params to the path", () => {
    process.env.DOMAIN = "docker.localhost";
    process.env.PROTOCOL = "http";
    setClientName("subdomain-a");
    expect(
      linkToProps(
        { subdomain: "subdomain-a", path: "/", params: ["a", "b"] },
        { params: { a: "1", b: "2" } },
      ),
    ).toEqual({
      to: "/?a=1&b=2",
    });
  });

  it("substitutes URL params in path (e.g. :collectionId)", () => {
    process.env.DOMAIN = "docker.localhost";
    process.env.PROTOCOL = "http";
    setClientName("subdomain-a");
    expect(
      linkToProps(
        { subdomain: "subdomain-a", path: "/c/:collectionId/recipes/list" },
        { params: { collectionId: "my-kitchen" } },
      ),
    ).toEqual({
      to: "/c/my-kitchen/recipes/list",
    });
  });
});

describe("linkToHref", () => {
  it("returns the correct href for a link", () => {
    expect(
      linkToHref(
        { subdomain: "test", path: "/" },
        { domain: "docker.localhost" },
      ),
    ).toBe("http://test.docker.localhost/");
  });

  it("adds query params to the href", () => {
    expect(
      linkToHref(
        { subdomain: "test", path: "/", params: ["a", "b"] },
        { params: { a: "1", b: "2" }, domain: "docker.localhost" },
      ),
    ).toBe("http://test.docker.localhost/?a=1&b=2");
  });

  it("substitutes URL params in path", () => {
    expect(
      linkToHref(
        { subdomain: "test", path: "/c/:collectionId/recipes/:id" },
        {
          params: { collectionId: "c1", id: "r1" },
          domain: "docker.localhost",
        },
      ),
    ).toBe("http://test.docker.localhost/c/c1/recipes/r1");
  });

  it("handles an empty subdomain", () => {
    expect(
      linkToHref({ subdomain: "", path: "/" }, { domain: "docker.localhost" }),
    ).toBe("http://docker.localhost/");
  });

  it("throws an error if a param is not found in the link", () => {
    expect(() =>
      linkToHref(
        { subdomain: "test", path: "/", params: ["a", "b"] },
        { params: { a: "1", c: "2" }, domain: "docker.localhost" },
      ),
    ).toThrow();
  });

  it("also works on backend with process.env", () => {
    globalThis.document = undefined as unknown as Document;
    typedEnv.DOMAIN = "some.domain";
    typedEnv.PROTOCOL = "https";
    expect(linkToHref({ subdomain: "test", path: "/" })).toBe(
      "https://test.some.domain/",
    );
  });
});

describe("nested subdomains (hub model)", () => {
  it("linkToHref builds correct href for product-prefixed subdomains", () => {
    expect(
      linkToHref(
        { subdomain: "app.recipes", path: "/" },
        { domain: "scotterickson.info" },
      ),
    ).toBe("http://app.recipes.scotterickson.info/");

    expect(
      linkToHref(
        { subdomain: "recipes", path: "/" },
        { domain: "scotterickson.info" },
      ),
    ).toBe("http://recipes.scotterickson.info/");

    expect(
      linkToHref(
        { subdomain: "", path: "/" },
        { domain: "scotterickson.info" },
      ),
    ).toBe("http://scotterickson.info/");
  });

  it("setClientName accepts dotted client name when hostname matches", () => {
    globalThis.document = {
      location: {
        hostname: "app.recipes.scotterickson.info",
        host: "app.recipes.scotterickson.info",
        protocol: "http:",
      },
    } as unknown as Document;
    expect(() => setClientName("app.recipes")).not.toThrow();
  });

  it("getHost returns root domain after setClientName with dotted client", () => {
    globalThis.document = {
      location: {
        hostname: "app.recipes.scotterickson.info",
        host: "app.recipes.scotterickson.info",
        protocol: "http:",
      },
    } as unknown as Document;
    setClientName("app.recipes");
    expect(getHost()).toBe("scotterickson.info");
  });

  it("linkToProps returns to for same product subdomain, href for other product", () => {
    globalThis.document = {
      location: {
        hostname: "app.recipes.scotterickson.info",
        host: "app.recipes.scotterickson.info",
        protocol: "http:",
      },
    } as unknown as Document;
    setClientName("app.recipes");

    expect(linkToProps({ subdomain: "app.recipes", path: "/" })).toEqual({
      to: "/",
    });

    expect(linkToProps({ subdomain: "app.notebook", path: "/" })).toEqual({
      href: "http://app.notebook.scotterickson.info/",
    });
  });
});
