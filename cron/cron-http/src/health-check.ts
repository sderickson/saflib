import type { DbKey } from "@saflib/drizzle";
import type { HealthCheck } from "@saflib/node";
import { getAll } from "@saflib/cron-db";

/**
 * `cron`: warns when an enabled cron job's last run failed or timed out.
 * Names the failing jobs (they're code-defined names, not user input).
 */
export function createCronHealthCheck(options: { getDbKey: () => DbKey }): HealthCheck {
  return {
    name: "cron",
    async run() {
      const { result: settings, error } = await getAll(options.getDbKey());
      if (error) throw error;
      const enabled = settings.filter((s) => s.enabled);
      const failing = enabled.filter(
        (s) => s.last_run_status === "fail" || s.last_run_status === "timed out",
      );
      return {
        status: failing.length > 0 ? "warn" : "ok",
        summary:
          failing.length > 0
            ? `last run failed: ${failing.map((s) => s.job_name).join(", ")}`
            : `${enabled.length} enabled job(s), none failing`,
        observed: { enabled: enabled.length, failing: failing.length },
      };
    },
  };
}
