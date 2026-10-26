import { describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import { OPENAPI_TAG_BLOCK_HTML_EXEMPT } from "@saflib/openapi";
import { blockHtml, makeBlockHtmlMiddleware } from "./blockHtml.ts";

function runBlockHtml(body: unknown): { status?: number; json?: unknown } {
  const res = {
    statusCode: 200,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      return { status: this.statusCode, json: payload };
    },
  } as Response & { statusCode: number };

  let outcome: { status?: number; json?: unknown } = { status: 200 };
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  res.json = (payload: unknown) => {
    outcome = { status: res.statusCode, json: payload };
    return res;
  };

  const next = vi.fn();
  blockHtml({ body } as Request, res, next);
  if (next.mock.calls.length) {
    return { status: 200 };
  }
  return outcome;
}

describe("blockHtml", () => {
  it("allows program markdown with br line breaks", () => {
    expect(
      runBlockHtml({
        program: "#### Piece *composer<br />(b. 1937)*",
      }).status,
    ).toBe(200);
  });

  it("rejects script and attributed tags", () => {
    expect(runBlockHtml({ title: "<script>x</script>" }).json).toEqual({
      error: "HTML is not allowed",
    });
    expect(runBlockHtml({ title: '<br onclick="x">' }).json).toEqual({
      error: "HTML is not allowed",
    });
  });

  it("rejects non-br tags", () => {
    expect(runBlockHtml({ note: "<div>text</div>" }).json).toEqual({
      error: "HTML is not allowed",
    });
  });
});

describe("makeBlockHtmlMiddleware", () => {
  it("skips blocking when the operation is tagged block-html-exempt", () => {
    const middleware = makeBlockHtmlMiddleware();
    const next = vi.fn();
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;

    middleware(
      {
        body: { program: "<div>x</div>" },
        openapi: {
          schema: { tags: [OPENAPI_TAG_BLOCK_HTML_EXEMPT] },
        },
      } as Request,
      res,
      next,
    );

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
