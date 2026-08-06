import { signAssertion } from "@saflib/node";
import { Agent, fetch as undiciFetch } from "undici";

export interface CreateInternalCallerOptions {
  /** Absolute path to the unix domain socket served by the internal listener. */
  socketPath: string;
}

export interface InternalCallerRequest {
  /** OpenAPI operationId bound into the assertion. */
  operationId: string;
  method: string;
  /** Request path, e.g. `/matters/123`. */
  path: string;
  body?: unknown;
  query?: Record<string, string>;
  asUser: { userId: string; mfaCompleted?: boolean };
  requestId?: string;
}

export type InternalCaller = (
  input: InternalCallerRequest,
) => Promise<Response>;

const ASSERTION_TTL_MS = 30_000;

/**
 * Creates a low-level fetch-compatible client that signs a per-request identity
 * assertion and dispatches over a unix domain socket.
 *
 * Untyped by design — higher layers (e.g. jobs runtime) wrap this with
 * openapi-fetch or similar.
 */
export function createInternalCaller(
  options: CreateInternalCallerOptions,
): InternalCaller {
  const agent = new Agent({
    connect: { socketPath: options.socketPath },
  });

  return async (input: InternalCallerRequest): Promise<Response> => {
    const issuedAt = Date.now();
    const token = signAssertion({
      userId: input.asUser.userId,
      targetOperationId: input.operationId,
      requestId: input.requestId,
      mfaCompleted: input.asUser.mfaCompleted,
      issuedAt,
      expiresAt: issuedAt + ASSERTION_TTL_MS,
    });

    const url = new URL(input.path, "http://localhost");
    if (input.query) {
      for (const [key, value] of Object.entries(input.query)) {
        url.searchParams.set(key, value);
      }
    }

    const headers: Record<string, string> = {
      "x-saf-identity-assertion": token,
    };
    let body: string | undefined;
    if (input.body !== undefined) {
      headers["content-type"] = "application/json";
      body = JSON.stringify(input.body);
    }

    // undici's Response is API-compatible with the global fetch Response.
    return undiciFetch(url, {
      method: input.method,
      headers,
      body,
      dispatcher: agent,
    }) as unknown as Promise<Response>;
  };
}
