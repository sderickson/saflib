import { expect } from "vitest";
import type { Response } from "supertest";

let mockCounter = 0;

export function makeUserHeaders(
  userId: string = `${mockCounter++}`,
  email: string = `user${mockCounter}@example.com`,
): Record<string, string> {
  return {
    "x-user-id": userId,
    "x-user-email": email,
    "x-user-email-verified": "true",
    "x-user-scopes": "none",
  };
}

/**
 * Helper function to check if a test response has the expected status code
 * and provides a more helpful error message if the test fails due to OpenAPI validation.
 *
 * @param response The supertest response object
 * @param expectedStatus The expected HTTP status code
 * @param message Optional custom error message
 */
export function expectStatus(
  response: Response,
  expectedStatus: number,
  message?: string,
): void {
  // Check if we got a 500 error but expected something else
  if (response.status === 500 && expectedStatus !== 500) {
    // Check if the error is related to OpenAPI validation
    const isOpenApiValidationError =
      response.text.includes("no schema defined for status code") ||
      response.text.includes("openapi spec");

    if (isOpenApiValidationError) {
      console.error("\n\n⚠️ OPENAPI VALIDATION ERROR ⚠️");
      console.error(
        `Expected status ${expectedStatus} but got 500 due to OpenAPI validation error.`,
      );
      console.error(
        "Make sure the status code is defined in the OpenAPI spec for this route.",
      );
      console.error(
        "See node-express/docs/testing-guidelines.md for more information.\n\n",
      );
      throw new Error(
        `Expected status ${expectedStatus} but got 500 due to OpenAPI validation error.`,
      );
    }
  }

  // Perform the actual assertion
  expect(
    response.status,
    message || `Expected status ${expectedStatus} but got ${response.status}`,
  ).toBe(expectedStatus);
}

/**
 * Example usage:
 *
 * ```typescript
 * it('should return 403 for unauthorized access', async () => {
 *   const response = await request(app)
 *     .get('/protected-resource')
 *     .set(unauthorizedHeaders);
 *
 *   expectStatus(response, 403);
 *   expect(response.body).toMatchObject({
 *     message: 'Unauthorized access',
 *   });
 * });
 * ```
 */
