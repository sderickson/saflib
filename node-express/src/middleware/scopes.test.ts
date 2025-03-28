import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { createScopeValidator } from "./scopes.ts";
import type { OpenAPIV3 } from "express-openapi-validator/dist/framework/types.ts";

describe("Scope Validation Middleware", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Setup mock request
    mockReq = {
      path: "/api/todos",
      method: "DELETE",
      auth: {
        userId: 1,
        userEmail: "test@example.com",
        scopes: [],
      },
    };

    // Setup mock response
    mockRes = {};

    // Setup next function mock
    nextFunction = vi.fn();
  });

  it("should allow access when no scopes are required", () => {
    const apiSpec: OpenAPIV3.DocumentV3 = {
      openapi: "3.0.0",
      info: { title: "Test API", version: "1.0.0" },
      paths: {
        "/api/todos": {
          delete: {
            summary: "Delete all todos",
            responses: {
              "200": { description: "Success" },
            },
          },
        },
      },
    };

    const middleware = createScopeValidator(apiSpec);
    middleware(mockReq as Request, mockRes as Response, nextFunction);

    expect(nextFunction).toHaveBeenCalledWith();
  });

  it("should allow access when user has required scope", () => {
    const apiSpec: OpenAPIV3.DocumentV3 = {
      openapi: "3.0.0",
      info: { title: "Test API", version: "1.0.0" },
      paths: {
        "/api/todos": {
          delete: {
            summary: "Delete all todos",
            security: [{ scopes: ["admin"] }],
            responses: {
              "200": { description: "Success" },
            },
          },
        },
      },
    };

    mockReq.auth!.scopes = ["admin"];
    const middleware = createScopeValidator(apiSpec);
    middleware(mockReq as Request, mockRes as Response, nextFunction);

    expect(nextFunction).toHaveBeenCalledWith();
  });

  it("should allow access when user has all required scopes", () => {
    const apiSpec: OpenAPIV3.DocumentV3 = {
      openapi: "3.0.0",
      info: { title: "Test API", version: "1.0.0" },
      paths: {
        "/api/todos": {
          delete: {
            summary: "Delete all todos",
            security: [{ scopes: ["admin", "write"] }],
            responses: {
              "200": { description: "Success" },
            },
          },
        },
      },
    };

    mockReq.auth!.scopes = ["admin", "write"];
    const middleware = createScopeValidator(apiSpec);
    middleware(mockReq as Request, mockRes as Response, nextFunction);

    expect(nextFunction).toHaveBeenCalledWith();
  });

  it("should deny access when user is missing required scope", () => {
    const apiSpec: OpenAPIV3.DocumentV3 = {
      openapi: "3.0.0",
      info: { title: "Test API", version: "1.0.0" },
      paths: {
        "/api/todos": {
          delete: {
            summary: "Delete all todos",
            security: [
              {
                scopes: ["admin"],
              },
            ],
            responses: {
              "200": { description: "Success" },
            },
          },
        },
      },
    };

    mockReq.auth!.scopes = ["read"];
    const middleware = createScopeValidator(apiSpec);
    middleware(mockReq as Request, mockRes as Response, nextFunction);

    expect(nextFunction).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 403,
        message: "Insufficient permissions. Required scopes: admin",
      })
    );
  });

  it("should deny access when user is missing any required scope", () => {
    const apiSpec: OpenAPIV3.DocumentV3 = {
      openapi: "3.0.0",
      info: { title: "Test API", version: "1.0.0" },
      paths: {
        "/api/todos": {
          delete: {
            summary: "Delete all todos",
            security: [{ scopes: ["admin", "write"] }],
            responses: {
              "200": { description: "Success" },
            },
          },
        },
      },
    };

    mockReq.auth!.scopes = ["admin"];
    const middleware = createScopeValidator(apiSpec);
    middleware(mockReq as Request, mockRes as Response, nextFunction);

    expect(nextFunction).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 403,
        message: "Insufficient permissions. Required scopes: admin, write",
      })
    );
  });

  it("should use global security requirements when operation has none", () => {
    const apiSpec: OpenAPIV3.DocumentV3 = {
      openapi: "3.0.0",
      info: { title: "Test API", version: "1.0.0" },
      security: [{ scopes: ["admin"] }],
      paths: {
        "/api/todos": {
          delete: {
            summary: "Delete all todos",
            responses: {
              "200": { description: "Success" },
            },
          },
        },
      },
    };

    mockReq.auth!.scopes = ["read"];
    const middleware = createScopeValidator(apiSpec);
    middleware(mockReq as Request, mockRes as Response, nextFunction);

    expect(nextFunction).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 403,
        message: "Insufficient permissions. Required scopes: admin",
      })
    );
  });

  it("should allow access to paths not defined in spec", () => {
    const apiSpec: OpenAPIV3.DocumentV3 = {
      openapi: "3.0.0",
      info: { title: "Test API", version: "1.0.0" },
      paths: {
        "/api/todos": {
          delete: {
            summary: "Delete all todos",
            security: [{ scopes: ["admin"] }],
            responses: {
              "200": { description: "Success" },
            },
          },
        },
      },
    };

    const unknownPathReq = {
      ...mockReq,
      path: "/api/unknown",
    };
    const middleware = createScopeValidator(apiSpec);
    middleware(unknownPathReq as Request, mockRes as Response, nextFunction);

    expect(nextFunction).toHaveBeenCalledWith();
  });
});
