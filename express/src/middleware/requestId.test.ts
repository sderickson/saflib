import { describe, it, expect, vi } from "vitest";
import { Request, Response, NextFunction } from "express";
import { requestId } from "./requestId.ts";

describe("requestId middleware", () => {
  it("should add a request ID to the request object from header", () => {
    const req = {} as Request;
    const res = {} as Response;
    const next = vi.fn() as unknown as NextFunction;

    req.headers = {
      "x-request-id": "1234567890",
    };

    requestId(req, res, next);

    expect(req.id).toBe("1234567890");
    expect(next).toHaveBeenCalled();
  });
});
