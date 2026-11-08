import createError from "http-errors";
import { createHandler } from "@saflib/express";
import type { OpsResponseBody } from "@saflib/ops-spec";
import { listTemplates } from "@saflib/node-log-db";
import { opsServiceStorage } from "../context.ts";
import { mapLogTemplate, queryDate, queryString } from "./_helpers.ts";

const DAY_MS = 86_400_000;

export const listOpsLogTemplatesHandler = createHandler(async function (req, res) {
  const { logsDbKey } = opsServiceStorage.getStore()!;
  if (!logsDbKey) throw createError(404, "Logs are not enabled for this product");
  const since = queryDate(req.query.since) ?? new Date(Date.now() - DAY_MS);
  // The validator may have coerced it to a boolean already.
  const onlyNew = String(req.query.only_new) === "true";
  const { result, error } = await listTemplates(logsDbKey, {
    since,
    onlyNew,
    service: queryString(req.query.service),
    limit: req.query.limit === undefined ? undefined : Number(req.query.limit),
  });
  if (error) throw error satisfies never;
  const response: OpsResponseBody["listOpsLogTemplates"][200] = {
    since: since.toISOString(),
    templates: result.map(mapLogTemplate),
  };
  res.status(200).json(response);
});
