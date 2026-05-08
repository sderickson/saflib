import { afterAll, beforeAll, describe, expect, it } from "vitest";
import express from "express";
import request from "supertest";
import { typedEnv } from "@saflib/env";
import { makeCsrfMiddleware } from "./csrf.ts";
import { makeCsrfTokenMiddleware } from "./csrf-token.ts";

const getSetCookieValues = (
  value: string | string[] | undefined,
): string[] | undefined => {
  if (value === undefined) {
    return undefined;
  }
  return Array.isArray(value) ? value : [value];
};

const parseSetCookie = (setCookieHeader: string): Record<string, string> => {
  const parts = setCookieHeader.split(";").map((part) => part.trim());
  const [nameValue, ...attributes] = parts;
  const [, value = ""] = nameValue.split("=");
  const parsed: Record<string, string> = { value };

  for (const attr of attributes) {
    const [attrName, attrValue = "true"] = attr.split("=");
    parsed[attrName.toLowerCase()] = attrValue;
  }

  return parsed;
};

describe("CSRF token middleware", () => {
  const originalDomain = process.env.DOMAIN;
  const originalProtocol = process.env.PROTOCOL;

  beforeAll(() => {
    process.env.DOMAIN = "daemon.docker.localhost";
    process.env.PROTOCOL = "http";
  });

  afterAll(() => {
    process.env.DOMAIN = originalDomain;
    process.env.PROTOCOL = originalProtocol;
  });

  it("issues a csrf cookie with expected attributes when missing", async () => {
    const app = express();
    app.use(makeCsrfTokenMiddleware());
    app.get("/issue", (_req, res) => {
      res.status(200).json({ ok: true });
    });

    const response = await request(app).get("/issue");

    expect(response.status).toBe(200);
    const setCookies = getSetCookieValues(response.headers["set-cookie"]);
    expect(setCookies).toBeTruthy();
    const csrfCookie = setCookies!.find((c) => c.startsWith("_csrf_token="));
    expect(csrfCookie).toBeTruthy();

    const parsed = parseSetCookie(csrfCookie as string);
    expect(parsed.value).toMatch(/^[a-f0-9]{48}$/);
    expect(parsed.path).toBe("/");
    expect(parsed.samesite).toBe("Lax");
    expect(parsed.domain).toBe(".daemon.docker.localhost");

    if (typedEnv.PROTOCOL === "https") {
      expect(parsed.secure).toBe("true");
    } else {
      expect(parsed.secure).toBeUndefined();
    }
  });

  it("does not regenerate token when cookie already exists", async () => {
    const app = express();
    app.use(makeCsrfTokenMiddleware());
    app.get("/issue", (_req, res) => {
      res.status(200).json({ ok: true });
    });

    const token = "a".repeat(48);
    const response = await request(app)
      .get("/issue")
      .set("Cookie", [`_csrf_token=${token}`]);

    expect(response.status).toBe(200);
    expect(getSetCookieValues(response.headers["set-cookie"])).toBeUndefined();
  });
});

describe("CSRF validator middleware", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeAll(() => {
    process.env.NODE_ENV = "development";
  });

  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it("returns 403 for mismatched token", async () => {
    const app = express();
    app.use(makeCsrfTokenMiddleware());
    app.use(makeCsrfMiddleware());
    app.post("/protected", (_req, res) => {
      res.status(200).json({ ok: true });
    });

    const response = await request(app)
      .post("/protected")
      .set("Cookie", ["_csrf_token=abc"])
      .set("X-CSRF-Token", "xyz");

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      error: "Forbidden",
      message: "CSRF validation failed",
    });
  });

  it("allows state-changing request when cookie and header match", async () => {
    const app = express();
    app.use(makeCsrfTokenMiddleware());
    app.use(makeCsrfMiddleware());
    app.post("/protected", (_req, res) => {
      res.status(200).json({ ok: true });
    });

    const token = "b".repeat(48);
    const response = await request(app)
      .post("/protected")
      .set("Cookie", [`_csrf_token=${token}`])
      .set("X-CSRF-Token", token);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });

  it("bypasses csrf for routes tagged no-auth", async () => {
    const app = express();
    app.use((req, _res, next) => {
      req.openapi = { schema: { tags: ["no-auth"] } } as any;
      next();
    });
    app.use(makeCsrfTokenMiddleware());
    app.use(makeCsrfMiddleware());
    app.post("/contact", (_req, res) => {
      res.status(200).json({ ok: true });
    });

    const response = await request(app).post("/contact");
    expect(response.status).toBe(200);
  });

  it("bypasses csrf for safe methods", async () => {
    const app = express();
    app.use(makeCsrfTokenMiddleware());
    app.use(makeCsrfMiddleware());
    app.get("/safe", (_req, res) => {
      res.status(200).json({ ok: true });
    });

    const response = await request(app).get("/safe");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });
});
