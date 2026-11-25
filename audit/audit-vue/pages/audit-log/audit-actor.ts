import type { AuditLog } from "@saflib/audit-spec/types";
import { shortId } from "@saflib/vue";

export type AuditActorView =
  | { kind: "user"; id: string }
  | { kind: "ops-token" | "cron" | "webhook" | "system"; label?: string }
  | { kind: "none" };

/** Who did it, for display: a person, a machine actor, or nobody. */
export function auditActor(
  row: Pick<AuditLog, "source" | "actor_user_id" | "auth_method">,
): AuditActorView {
  const id = row.actor_user_id;
  if (row.auth_method === "ops_token" || id?.startsWith("ops_token:")) {
    return { kind: "ops-token", label: id ? shortId(id) : undefined };
  }
  if (row.source === "cron") return { kind: "cron" };
  if (row.source === "system" && !id) return { kind: "system" };
  if (row.source === "webhook" && !id) return { kind: "webhook" };
  if (id) return { kind: "user", id };
  if (row.source === "system") return { kind: "system" };
  if (row.source === "webhook") return { kind: "webhook" };
  return { kind: "none" };
}
