import { http, HttpResponse } from "msw";
import { typedCreateHandler } from "@saflib/sdk/testing";
import type { Paths } from "@saflib/secrets-spec";

// TODO: Replace with your actual API endpoints and response data
export const templateFileMockHandlers = [
  // Example: List secrets endpoint
  http.get("*/secrets", () => {
    return HttpResponse.json([
      {
        id: "secret-1",
        name: "database-password",
        masked_value: "db_pass***",
        is_active: true,
        created_at: 1640995200000,
        updated_at: 1640995200000,
      },
      {
        id: "secret-2",
        name: "api-key",
        masked_value: "api_key***",
        is_active: true,
        created_at: 1640995200000,
        updated_at: 1640995200000,
      },
    ]);
  }),

  // Example: Create secret endpoint
  http.post("*/secrets", async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json(
      {
        id: "secret-new",
        name: body.name,
        masked_value: "new_secret***",
        is_active: true,
        created_at: Date.now(),
        updated_at: Date.now(),
      },
      { status: 201 },
    );
  }),
];

// TODO: Replace "templateFile" with your actual operation name
export const templateFileFakeHandlers = typedCreateHandler(
  "templateFile",
  templateFileMockHandlers,
);
