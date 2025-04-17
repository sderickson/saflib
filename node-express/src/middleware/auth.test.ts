import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { auth } from "./auth.ts";

describe("Auth Middleware", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Setup mock request
    mockReq = {
      headers: {},
    };

    // Setup mock response
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    // Setup next function mock
    nextFunction = vi.fn();
  });

  it("should populate auth object with user info and empty scopes when no scope header", () => {
    mockReq.headers = {
      "x-user-id": "123",
      "x-user-email": "test@example.com",
    };

    auth(mockReq as Request, mockRes as Response, nextFunction);

    expect(mockReq.auth).toEqual({
      userId: 123,
      userEmail: "test@example.com",
      scopes: [],
    });
    expect(nextFunction).toHaveBeenCalledWith();
  });

  it("should populate auth object with user info and scopes from header", () => {
    mockReq.headers = {
      "x-user-id": "123",
      "x-user-email": "test@example.com",
      "x-user-scopes": "admin,write",
    };

    auth(mockReq as Request, mockRes as Response, nextFunction);

    expect(mockReq.auth).toEqual({
      userId: 123,
      userEmail: "test@example.com",
      scopes: ["admin", "write"],
    });
    expect(nextFunction).toHaveBeenCalledWith();
  });

  it("should handle empty scopes header by returning empty array", () => {
    mockReq.headers = {
      "x-user-id": "123",
      "x-user-email": "test@example.com",
      "x-user-scopes": "",
    };

    auth(mockReq as Request, mockRes as Response, nextFunction);

    expect(mockReq.auth).toEqual({
      userId: 123,
      userEmail: "test@example.com",
      scopes: [],
    });
    expect(nextFunction).toHaveBeenCalledWith();
  });

  it("should return 401 when user ID is missing", () => {
    mockReq.headers = {
      "x-user-email": "test@example.com",
      "x-user-scopes": "admin",
    };

    auth(mockReq as Request, mockRes as Response, nextFunction);
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: "Unauthorized",
      message: "Unauthorized",
    });
  });

  it("should return 401 when user email is missing", () => {
    mockReq.headers = {
      "x-user-id": "123",
      "x-user-scopes": "admin",
    };

    auth(mockReq as Request, mockRes as Response, nextFunction);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: "Unauthorized",
      message: "Unauthorized",
    });
  });

  it("should return 401 when both user ID and email are missing", () => {
    mockReq.headers = {
      "x-user-scopes": "admin",
    };

    auth(mockReq as Request, mockRes as Response, nextFunction);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: "Unauthorized",
      message: "Unauthorized",
    });
  });
});
