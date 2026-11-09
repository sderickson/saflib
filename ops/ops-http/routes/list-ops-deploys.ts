import { createHandler } from "@saflib/express";
import type { OpsResponseBody } from "@saflib/ops-spec";
import { countBootsSince, listBoots } from "@saflib/ops-db";
import { opsServiceStorage } from "../context.ts";
import { mapOpsBoot } from "./_helpers.ts";

const DAY_MS = 24 * 60 * 60 * 1000;

export const listOpsDeploysHandler = createHandler(async function (req, res) {
  const { dbKey, currentBoot } = opsServiceStorage.getStore()!;
  const limit = Math.min(Number(req.query.limit ?? 20) || 20, 100);
  // Await our own boot first so it is included in the queries below.
  const current = await currentBoot;
  const [deploys, boots] = await Promise.all([
    listBoots(dbKey, { newBuildsOnly: true, limit }),
    countBootsSince(dbKey, new Date(Date.now() - DAY_MS)),
  ]);
  if (deploys.error || boots.error) {
    throw deploys.error ?? boots.error;
  }
  const response: OpsResponseBody["listOpsDeploys"][200] = {
    current: current ? mapOpsBoot(current) : null,
    deploys: deploys.result.map(mapOpsBoot),
    boots_last_24h: boots.result,
  };
  res.status(200).json(response);
});
