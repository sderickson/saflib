import createError from "http-errors";
import type { Request, Response } from "express";
import { createHandler } from "@saflib/express";
import type { DbKey } from "@saflib/drizzle";
import type { OpsRequestBody, OpsResponseBody } from "@saflib/ops-spec";
import {
  getIssue,
  IssueNotFoundError,
  listIssues,
  listOccurrences,
  setIssueStatus,
  type IssueLevel,
  type IssueStatus,
  type SetIssueStatusParams,
} from "@saflib/errors-db";
import { opsServiceStorage } from "../context.ts";
import { mapIssue, mapOccurrence, queryDate, queryList, queryString } from "./_helpers.ts";
import { callerActor } from "./_helpers.ts";

function issuesDbKey(): DbKey {
  const { issuesDbKey } = opsServiceStorage.getStore()!;
  if (!issuesDbKey) throw createError(404, "Issues are not enabled for this product");
  return issuesDbKey;
}

function notFound(id: string): never {
  throw createError(404, `No issue with id ${id}`);
}

export const listOpsIssuesHandler = createHandler(async function (req, res) {
  const q = req.query;
  const { result, error } = await listIssues(issuesDbKey(), {
    statuses: queryList(q.status) as IssueStatus[] | undefined,
    levels: queryList(q.level) as IssueLevel[] | undefined,
    kinds: queryList(q.kind),
    windowSince: queryDate(q.since),
    newInWindow: String(q.new) === "true",
    regressedInWindow: String(q.regressed) === "true",
    sort: queryString(q.sort) as "last_seen" | "first_seen" | "count" | "window_count" | undefined,
    limit: q.limit === undefined ? undefined : Number(q.limit),
    cursor: queryString(q.cursor),
  });
  if (error) throw error satisfies never;
  const response: OpsResponseBody["listOpsIssues"][200] = {
    issues: result.issues.map(mapIssue),
    next_cursor: result.nextCursor,
  };
  res.status(200).json(response);
});

export const getOpsIssueHandler = createHandler(async function (req, res) {
  const id = String(req.params.id);
  const { result, error } = await getIssue(issuesDbKey(), id);
  if (error) {
    switch (true) {
      case error instanceof IssueNotFoundError:
        notFound(id);
      default:
        throw error satisfies never;
    }
  }
  const response: OpsResponseBody["getOpsIssue"][200] = { issue: mapIssue(result) };
  res.status(200).json(response);
});

export const listOpsIssueOccurrencesHandler = createHandler(async function (req, res) {
  const id = String(req.params.id);
  const limit = req.query.limit === undefined ? undefined : Number(req.query.limit);
  const { result, error } = await listOccurrences(issuesDbKey(), id, limit);
  if (error) {
    switch (true) {
      case error instanceof IssueNotFoundError:
        notFound(id);
      default:
        throw error satisfies never;
    }
  }
  const response: OpsResponseBody["listOpsIssueOccurrences"][200] = {
    occurrences: result.map(mapOccurrence),
  };
  res.status(200).json(response);
});


async function triage(req: Request, res: Response, params: SetIssueStatusParams) {
  const id = String(req.params.id);
  const { result, error } = await setIssueStatus(issuesDbKey(), id, params);
  if (error) {
    switch (true) {
      case error instanceof IssueNotFoundError:
        notFound(id);
      default:
        throw error satisfies never;
    }
  }
  res.status(200).json({ issue: mapIssue(result) });
}

export const resolveOpsIssueHandler = createHandler(async function (req, res) {
  const body: OpsRequestBody["resolveOpsIssue"] = req.body;
  await triage(req, res, {
    status: "resolved",
    actor: callerActor(res),
    note: body.note,
    resolvedInVersion: body.resolved_in_version,
  });
});

export const ignoreOpsIssueHandler = createHandler(async function (req, res) {
  const body: OpsRequestBody["ignoreOpsIssue"] = req.body;
  const until = body.until ? new Date(body.until) : null;
  if (until && until.getTime() <= Date.now()) throw createError(400, "until must be in the future");
  await triage(req, res, { status: "ignored", actor: callerActor(res), note: body.note, until });
});

export const reopenOpsIssueHandler = createHandler(async function (req, res) {
  const body: OpsRequestBody["reopenOpsIssue"] = req.body;
  await triage(req, res, { status: "open", actor: callerActor(res), note: body.note });
});
