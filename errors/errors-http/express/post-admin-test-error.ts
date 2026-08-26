import { randomUUID } from "node:crypto";
import { createHandler } from "./handler.ts";

export function createPostAdminTestErrorHandler() {
  return createHandler(async (_req, _res) => {
    throw new Error(
      `Intentional admin test error id=${randomUUID()} (POST /admin/test-error)`,
    );
  });
}
