import { createHandler } from "@saflib/express";
import type { OpsDependencies, OpsResponseBody } from "@saflib/ops-spec";
import { getLatestDependencyCheck } from "@saflib/ops-db";
import { throwError } from "@saflib/utils";
import type { DbKey } from "@saflib/drizzle";
import { opsServiceStorage } from "../context.ts";
import type { DependencyReport } from "../dependencies/check.ts";
import { findAcceptance, type AcceptedAdvisory } from "../dependencies/accepted.ts";

/** A check older than this counts as stale. */
export const DEPENDENCY_CHECK_STALE_MS = 72 * 3_600_000;

/**
 * The latest stored report in API shape, or null if there is none.
 * Acceptances apply at read time, so changing them needs no new check.
 */
export async function latestDependencies(
  dbKey: DbKey,
  now: Date = new Date(),
  accepted: AcceptedAdvisory[] = [],
): Promise<OpsDependencies | null> {
  const row = await throwError(getLatestDependencyCheck(dbKey));
  if (!row) return null;
  const r = JSON.parse(row.report) as DependencyReport;
  return {
    checked_at: r.checked_at,
    stale: now.getTime() - Date.parse(r.checked_at) > DEPENDENCY_CHECK_STALE_MS,
    packages_total: r.packages_total,
    direct_total: r.direct_total,
    node_version: r.node_version,
    lockfile_hash: r.lockfile_hash,
    advisories: r.advisories.map(({ summary, ...a }) => {
      const acceptance = findAcceptance([a.id, ...a.aliases], accepted, now);
      return {
        ...a,
        actionable: a.actionable && !acceptance,
        accepted: acceptance ? { reason: acceptance.reason, until: acceptance.until ?? null } : null,
        untrusted: { summary },
      };
    }),
    outdated: r.outdated,
    // Reports from before scopes existed only checked the image.
    runtime: (r.runtime ?? []).map((c) => ({ ...c, scope: c.scope ?? "image" })),
    errors: r.errors,
  };
}

export const getOpsDependenciesHandler = createHandler(async function (_req, res) {
  const { dbKey, acceptedAdvisories } = opsServiceStorage.getStore()!;
  const response: OpsResponseBody["getOpsDependencies"][200] = {
    dependencies: await latestDependencies(dbKey, new Date(), acceptedAdvisories),
  };
  res.status(200).json(response);
});
