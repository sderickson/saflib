import { expect, test } from "vitest";
import { getSubdomainProxyRewrite } from "./subdomain-proxy.ts";

const domain = "docker.localhost";
const hosts = [
  "docker.localhost",
  "app.docker.localhost",
  "auth.docker.localhost",
  "account.docker.localhost",
  "admin.docker.localhost",
];

test("rewrites auth subdomain path to auth/index.html", () => {
  expect(
    getSubdomainProxyRewrite("/register", "auth.docker.localhost", hosts, domain),
  ).toBe("/auth/index.html");
});

test("preserves query string when rewriting", () => {
  expect(
    getSubdomainProxyRewrite(
      "/register?redirect=http%3A%2F%2Fapp.recipes.docker.localhost%2F",
      "auth.docker.localhost",
      hosts,
      domain,
    ),
  ).toBe(
    "/auth/index.html?redirect=http%3A%2F%2Fapp.recipes.docker.localhost%2F",
  );
});

test("query with dots (redirect URL) does not trigger pass-through", () => {
  const url = "/register?redirect=http://app.recipes.docker.localhost/";
  const result = getSubdomainProxyRewrite(
    url,
    "auth.docker.localhost",
    hosts,
    domain,
  );
  expect(result).toBe(
    "/auth/index.html?redirect=http://app.recipes.docker.localhost/",
  );
});

test("path with dot (static asset) passes through", () => {
  expect(
    getSubdomainProxyRewrite(
      "/favicon.ico",
      "auth.docker.localhost",
      hosts,
      domain,
    ),
  ).toBeNull();
  expect(
    getSubdomainProxyRewrite(
      "/assets/main.js",
      "auth.docker.localhost",
      hosts,
      domain,
    ),
  ).toBeNull();
});

test("path with @ passes through", () => {
  expect(
    getSubdomainProxyRewrite(
      "/@vite/client",
      "auth.docker.localhost",
      hosts,
      domain,
    ),
  ).toBeNull();
});

test("localhost host rewrites to root index.html", () => {
  expect(
    getSubdomainProxyRewrite("/anything", "localhost:5173", hosts, domain),
  ).toBe("/index.html");
  expect(
    getSubdomainProxyRewrite("/", "localhost:5173", hosts, domain),
  ).toBe("/index.html");
});

test("localhost preserves query", () => {
  expect(
    getSubdomainProxyRewrite("/login?foo=bar", "localhost:5173", hosts, domain),
  ).toBe("/index.html?foo=bar");
});

test("root domain rewrites to root index.html", () => {
  expect(
    getSubdomainProxyRewrite("/", "docker.localhost", hosts, domain),
  ).toBe("/index.html");
});

test("app subdomain rewrites to app/index.html", () => {
  expect(
    getSubdomainProxyRewrite(
      "/dashboard",
      "app.docker.localhost",
      hosts,
      domain,
    ),
  ).toBe("/app/index.html");
});

test("unknown host passes through", () => {
  expect(
    getSubdomainProxyRewrite(
      "/register",
      "other.docker.localhost",
      hosts,
      domain,
    ),
  ).toBeNull();
});

test("undefined url uses / pathname", () => {
  expect(
    getSubdomainProxyRewrite(undefined, "auth.docker.localhost", hosts, domain),
  ).toBe("/auth/index.html");
});

test("undefined host passes through", () => {
  expect(
    getSubdomainProxyRewrite("/register", undefined, hosts, domain),
  ).toBeNull();
});
