import { Router } from "express";
import createError from "http-errors";
import {
  createHandler,
  fetchKratosIdentitiesByIds,
  makeRegisterRoute,
} from "@saflib/express";
import { operationJsonSpec as lookupIdentitiesAdminSpec } from "@saflib/ory-kratos-spec/operations/lookupIdentitiesAdmin";
import { operationJsonSpec as listIdentitiesAdminSpec } from "@saflib/ory-kratos-spec/operations/listIdentitiesAdmin";
import { operationJsonSpec as getIdentityAdminSpec } from "@saflib/ory-kratos-spec/operations/getIdentityAdmin";
import type {
  IdentitySummary,
  KratosAdminRequestBody,
  KratosAdminResponseBody,
} from "@saflib/ory-kratos-spec";
import {
  createIdentityDirectory,
  matchesIdentitySearch,
  toIdentitySummary,
  type ResolveProfiles,
} from "./identity-directory.ts";

export interface KratosAdminRouterOptions {
  /** Names (and org/role) for identities; Kratos only stores the email. */
  resolveProfiles?: ResolveProfiles;
}

/**
 * Site-admin identity routes, mounted on the product's API:
 * - `POST /admin/identities/lookup`: ids → names and emails, for display.
 * - `GET /admin/identities`: list and search, for the Users page.
 * - `GET /admin/identities/{id}`: one person, with second factors.
 */
export function createKratosAdminRouter(
  options: KratosAdminRouterOptions = {},
): Router {
  const router = Router();
  const registerRoute = makeRegisterRoute();
  const directory = createIdentityDirectory(options.resolveProfiles);

  registerRoute(
    router,
    lookupIdentitiesAdminSpec,
    createHandler(async (req, res) => {
      const { ids } = req.body as KratosAdminRequestBody["lookupIdentitiesAdmin"];
      const result = await fetchKratosIdentitiesByIds(ids);
      if (!result.ok) {
        throw createError(502, "Identity service error");
      }
      const rawById = new Map(
        result.identities.map((raw) => [(raw as { id?: unknown }).id, raw]),
      );
      const foundIds = [...rawById.keys()].filter((id): id is string => typeof id === "string");
      const profiles =
        foundIds.length > 0 && options.resolveProfiles
          ? await options.resolveProfiles(foundIds)
          : {};
      const identities = foundIds
        .map((id) => toIdentitySummary(rawById.get(id), profiles[id]))
        .filter((s): s is IdentitySummary => s !== null);
      res.status(200).json({
        identities,
      } satisfies KratosAdminResponseBody["lookupIdentitiesAdmin"][200]);
    }),
  );

  registerRoute(
    router,
    listIdentitiesAdminSpec,
    createHandler(async (req, res) => {
      const q = typeof req.query.q === "string" ? req.query.q : "";
      const limit = Math.min(Math.max(Number(req.query.limit ?? 50) || 50, 1), 100);
      const offset = Math.max(Number(req.query.cursor ?? 0) || 0, 0);
      let all;
      try {
        all = await directory.all();
      } catch {
        throw createError(502, "Identity service error");
      }
      // Admins are pinned to the top (who can reach the admin is worth
      // seeing at a glance); otherwise the directory's order.
      const found = q ? all.filter((r) => matchesIdentitySearch(r, q)) : all;
      const matching = [...found.filter((r) => r.admin), ...found.filter((r) => !r.admin)];
      const page = matching.slice(offset, offset + limit);
      const nextOffset = offset + page.length;
      res.status(200).json({
        identities: page,
        next_cursor: nextOffset < matching.length ? String(nextOffset) : null,
        total: matching.length,
      } satisfies KratosAdminResponseBody["listIdentitiesAdmin"][200]);
    }),
  );

  registerRoute(
    router,
    getIdentityAdminSpec,
    createHandler(async (req, res) => {
      const result = await directory.get(String(req.params.id));
      if (!result.ok) {
        if (result.status === 404) throw createError(404, "User not found");
        throw createError(502, "Identity service error");
      }
      const { ok: _ok, ...body } = result;
      res
        .status(200)
        .json(body satisfies KratosAdminResponseBody["getIdentityAdmin"][200]);
    }),
  );

  return router;
}
