import { createHandler } from "@saflib/express";
import type { OpsResponseBody } from "@saflib/ops-spec";
import { opsServiceStorage } from "../context.ts";
import { runHealthChecks } from "../health/run-health-checks.ts";

export const getOpsHealthHandler = createHandler(async function (_req, res) {
  const { healthChecks } = opsServiceStorage.getStore()!;
  const response: OpsResponseBody["getOpsHealth"][200] = {
    health: await runHealthChecks(healthChecks),
  };
  res.status(200).json(response);
});
