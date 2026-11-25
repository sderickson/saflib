import { Router } from "express";
import createError from "http-errors";
import {
  createHandler,
  fetchKratosIdentitiesByIds,
  makeRegisterRoute,
} from "@saflib/express";
import { operationJsonSpec as lookupIdentitiesAdminSpec } from "@saflib/ory-kratos-spec/operations/lookupIdentitiesAdmin";
import type {
  IdentitySummary,
  KratosAdminRequestBody,
  KratosAdminResponseBody,
} from "@saflib/ory-kratos-spec";

/**
 * Display names for identity ids. Kratos traits only hold the email, so the
 * product supplies names from wherever it keeps them; omit or return
 * nothing to show emails only.
 */
export type ResolveDisplayNames = (
  ids: string[],
) => Promise<Record<string, string | null | undefined>>;

export interface KratosAdminRouterOptions {
  resolveDisplayNames?: ResolveDisplayNames;
}

interface KratosIdentityLike {
  id?: unknown;
  state?: unknown;
  created_at?: unknown;
  traits?: { email?: unknown };
  verifiable_addresses?: { verified?: unknown }[];
}

/** Maps a Kratos admin identity to what admin pages show. */
export function toIdentitySummary(
  raw: unknown,
  name: string | null = null,
): IdentitySummary | null {
  const identity = raw as KratosIdentityLike;
  if (!identity || typeof identity.id !== "string") return null;
  const email = identity.traits?.email;
  return {
    id: identity.id,
    email: typeof email === "string" && email.trim() ? email.trim() : null,
    name,
    verified: (identity.verifiable_addresses ?? []).some((a) => a.verified === true),
    state: typeof identity.state === "string" ? identity.state : "active",
    created_at:
      typeof identity.created_at === "string"
        ? identity.created_at
        : new Date(0).toISOString(),
  };
}

/**
 * Site-admin identity routes, mounted on the product's API:
 * - `POST /admin/identities/lookup`: ids → names and emails, for display.
 */
export function createKratosAdminRouter(
  options: KratosAdminRouterOptions = {},
): Router {
  const router = Router();
  const registerRoute = makeRegisterRoute();

  registerRoute(
    router,
    lookupIdentitiesAdminSpec,
    createHandler(async (req, res) => {
      const { ids } = req.body as KratosAdminRequestBody["lookupIdentitiesAdmin"];
      const result = await fetchKratosIdentitiesByIds(ids);
      if (!result.ok) {
        throw createError(502, "Identity service error");
      }
      const found = result.identities
        .map((raw) => toIdentitySummary(raw))
        .filter((s): s is IdentitySummary => s !== null);
      const names =
        found.length > 0 && options.resolveDisplayNames
          ? await options.resolveDisplayNames(found.map((s) => s.id))
          : {};
      const identities = found.map((s) => ({ ...s, name: names[s.id] ?? null }));
      res.status(200).json({
        identities,
      } satisfies KratosAdminResponseBody["lookupIdentitiesAdmin"][200]);
    }),
  );

  return router;
}
