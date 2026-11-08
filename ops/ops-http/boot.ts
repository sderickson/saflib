import client from "prom-client";
import type { DbKey } from "@saflib/drizzle";
import { getServiceName, getSafReporters } from "@saflib/node";
import { getBuildInfo, type BuildInfo } from "@saflib/node/git-hashes";
import { recordBoot, type OpsBoot } from "@saflib/ops-db";

function serviceName(): string {
  try {
    return getServiceName();
  } catch {
    return "unknown";
  }
}

function parseDate(value: string | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * `saf_build_info{service_name, build_ref, commit_root, commit_saflib} 1`, the
 * Prometheus convention for exposing a build as labels, so graphs can mark
 * deploys.
 */
export function registerBuildInfoMetric(info: BuildInfo | undefined, service: string) {
  const name = "saf_build_info";
  const existing = client.register.getSingleMetric(name);
  const gauge =
    (existing as client.Gauge<string> | undefined) ??
    new client.Gauge({
      name,
      help: "Build of the running process (always 1; the build is in the labels)",
      labelNames: ["service_name", "build_ref", "commit_root", "commit_saflib"],
    });
  gauge.reset();
  gauge.set(
    {
      service_name: service,
      build_ref: info?.buildRef ?? "unknown",
      commit_root: info?.commits?.root ?? "unknown",
      commit_saflib: info?.commits?.saflib ?? "unknown",
    },
    1,
  );
}

/**
 * Record this process's start in ops-db and publish `saf_build_info`.
 * Never throws: a failure is logged and resolves to `undefined`.
 */
export async function recordCurrentBoot(
  dbKey: DbKey,
  info: BuildInfo | undefined = getBuildInfo(),
): Promise<OpsBoot | undefined> {
  const service = serviceName();
  try {
    registerBuildInfoMetric(info, service);
    const { result } = await recordBoot(dbKey, {
      service_name: service,
      color: process.env.SAF_COLOR?.trim() || null,
      build_ref: info?.buildRef ?? null,
      image: info?.image ?? null,
      input_hash: info?.inputHash ?? null,
      commit_root: info?.commits?.root ?? null,
      commit_saflib: info?.commits?.saflib ?? null,
      dirty: info?.dirty ?? null,
      built_at: parseDate(info?.builtAt),
      node_version: process.version,
    });
    return result;
  } catch (e) {
    try {
      getSafReporters().log.warn("ops: could not record boot", { error: String(e) });
    } catch {
      // No reporters outside a SAF context (e.g. some tests); nothing to do.
    }
    return undefined;
  }
}
