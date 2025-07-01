import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { createScopeValidator } from "./scopes.js";
import type { OpenApiRequestMetadata } from "express-openapi-validator/dist/framework/types.js"; // Import the actual type
import { type SafContext, safStorage } from "@saflib/node";

// Define a type for the necessary parts of OpenApiRequestMetadata
interface MockOpenApiMetadata extends Partial<OpenApiRequestMetadata> {
  schema: {
    security?: { scopes?: string[] }[];
  };
  // Make other required fields non-optional
  expressRoute: any;
  openApiRoute: any;
  pathParams: any;
  serial: any;
}

// Extend the Request type to include the properties we expect
interface MockRequest extends Partial<Request> {
  openapi?: MockOpenApiMetadata; // Use our mock type
  auth?: {
    userId: number;
    userEmail: string;
    scopes: string[];
  };
}

describe("createScopeValidator", () => {
  let mockReq: MockRequest;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let scopeValidator: (req: Request, res: Response, next: NextFunction) => void;
  const defaultUserId = 1;
  const defaultUserEmail = "test@example.com";
  // Default mock values for OpenApiRequestMetadata fields (can be simple placeholders)
  const defaultOpenApiMetadata: MockOpenApiMetadata = {
    schema: { security: [] },
    expressRoute: "/mock",
    openApiRoute: "/mock",
    pathParams: {},
    serial: 0,
  };
  const mockContext: SafContext = {
    log: vi.fn() as any,
    requestId: "123",
  };

  beforeEach(() => {
    // Reset mocks before each test
    mockReq = {
      openapi: { ...defaultOpenApiMetadata, schema: { security: [] } }, // Use defaults, override schema as needed
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
      send: vi.fn(),
    };
    mockNext = vi.fn();
    vi.spyOn(safStorage, "getStore").mockReturnValue({
      auth: {
        userScopes: [],
        userId: defaultUserId,
        userEmail: defaultUserEmail,
        userEmailVerified: true,
      },
      ...mockContext,
    });
    scopeValidator = createScopeValidator() as any;
  });

  it("should call next() if no scopes are required", () => {
    mockReq.openapi = { ...defaultOpenApiMetadata, schema: {} }; // No security field in schema
    scopeValidator(mockReq as Request, mockRes as Response, mockNext);
    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it("should call next() if security field is empty", () => {
    mockReq.openapi = { ...defaultOpenApiMetadata, schema: { security: [] } }; // Empty security array
    scopeValidator(mockReq as Request, mockRes as Response, mockNext);
    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it("should call next() if security strategies have no scopes", () => {
    mockReq.openapi = {
      ...defaultOpenApiMetadata,
      schema: { security: [{}, {}] },
    }; // Strategies without scopes
    scopeValidator(mockReq as Request, mockRes as Response, mockNext);
    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it("should call next() if user has wildcard scope '*'", () => {
    mockReq.openapi = {
      ...defaultOpenApiMetadata,
      schema: { security: [{ scopes: ["admin"] }] },
    };
    vi.mocked(safStorage.getStore).mockReturnValue({
      auth: {
        userScopes: ["*"],
        userId: defaultUserId,
        userEmail: defaultUserEmail,
        userEmailVerified: true,
      },
      ...mockContext,
    });
    scopeValidator(mockReq as Request, mockRes as Response, mockNext);
    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it("should call next() if user has all required scopes", () => {
    mockReq.openapi = {
      ...defaultOpenApiMetadata,
      schema: { security: [{ scopes: ["read", "write"] }] },
    };
    vi.mocked(safStorage.getStore).mockReturnValue({
      auth: {
        userScopes: ["read", "write", "delete"],
        userId: defaultUserId,
        userEmail: defaultUserEmail,
        userEmailVerified: true,
      },
      ...mockContext,
    });
    scopeValidator(mockReq as Request, mockRes as Response, mockNext);
    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it("should call next() if user has all required scopes from multiple security requirements", () => {
    mockReq.openapi = {
      ...defaultOpenApiMetadata,
      schema: { security: [{ scopes: ["read"] }, { scopes: ["write"] }] },
    };
    vi.mocked(safStorage.getStore).mockReturnValue({
      auth: {
        userScopes: ["read", "write", "admin"],
        userId: defaultUserId,
        userEmail: defaultUserEmail,
        userEmailVerified: true,
      },
      ...mockContext,
    });
    scopeValidator(mockReq as Request, mockRes as Response, mockNext);
    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it("should return 403 if user is missing required scopes", () => {
    mockReq.openapi = {
      ...defaultOpenApiMetadata,
      schema: { security: [{ scopes: ["admin", "read"] }] },
    };
    vi.mocked(safStorage.getStore).mockReturnValue({
      auth: {
        userScopes: ["read"],
        userId: defaultUserId,
        userEmail: defaultUserEmail,
        userEmailVerified: true,
      },
      ...mockContext,
    });
    scopeValidator(mockReq as Request, mockRes as Response, mockNext);
    expect(mockNext).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: expect.stringContaining(
        "Insufficient permissions. Missing scopes: admin.",
      ),
    });
  });

  it("should return 403 if user is missing required scopes from multiple security requirements", () => {
    mockReq.openapi = {
      ...defaultOpenApiMetadata,
      schema: {
        security: [{ scopes: ["admin", "read"] }, { scopes: ["write"] }],
      },
    };
    vi.mocked(safStorage.getStore).mockReturnValue({
      auth: {
        userScopes: ["read"],
        userId: defaultUserId,
        userEmail: defaultUserEmail,
        userEmailVerified: true,
      },
      ...mockContext,
    });
    scopeValidator(mockReq as Request, mockRes as Response, mockNext);
    expect(mockNext).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: expect.stringMatching(
        /Missing scopes: (admin, write|write, admin)/,
      ),
    });
  });

  it("should behave correctly if req.auth is missing", () => {
    mockReq.openapi = {
      ...defaultOpenApiMetadata,
      schema: { security: [{ scopes: ["read"] }] },
    };
    vi.mocked(safStorage.getStore).mockReturnValue({
      ...mockContext,
    });
    scopeValidator(mockReq as Request, mockRes as Response, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(401);
  });

  it("should return 403 if user has no scopes (empty array)", () => {
    mockReq.openapi = {
      ...defaultOpenApiMetadata,
      schema: { security: [{ scopes: ["read"] }] },
    };
    vi.mocked(safStorage.getStore).mockReturnValue({
      auth: {
        userScopes: [],
        userId: defaultUserId,
        userEmail: defaultUserEmail,
        userEmailVerified: true,
      },
      ...mockContext,
    });
    scopeValidator(mockReq as Request, mockRes as Response, mockNext);
    expect(mockNext).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: expect.stringContaining(
        "Insufficient permissions. Missing scopes: read. You have the following scopes: ",
      ),
    });
  });

  it("should correctly list missing and present scopes in 403 message", () => {
    mockReq.openapi = {
      ...defaultOpenApiMetadata,
      schema: { security: [{ scopes: ["admin", "read", "special"] }] },
    };
    vi.mocked(safStorage.getStore).mockReturnValue({
      auth: {
        userScopes: ["read", "user"],
        userId: defaultUserId,
        userEmail: defaultUserEmail,
        userEmailVerified: true,
      },
      ...mockContext,
    });
    scopeValidator(mockReq as Request, mockRes as Response, mockNext);
    expect(mockNext).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: expect.stringMatching(
        /Missing scopes: (admin, special|special, admin). You have the following scopes: (read, user|user, read)/,
      ),
    });
  });
});
