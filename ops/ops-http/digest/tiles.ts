import type { OpsDigest, OpsDigestTile } from "@saflib/ops-spec";

export type DigestTile = OpsDigestTile;
type Attention = OpsDigest["summary"]["attention"][number];

/**
 * A product's tile(s) for the admin Overview, computed per digest. Return
 * null to show nothing. Throwing shows a "couldn't check" tile instead of
 * failing the digest.
 */
export interface DigestTileProvider {
  /** Used for the fallback tile if `tiles` throws. */
  key: string;
  label: string;
  group?: DigestTile["group"];
  tiles: (ctx: { since: Date }) => Promise<DigestTile | DigestTile[] | null>;
}

/** Run every provider; one failing doesn't hide the others. */
export async function runTileProviders(
  providers: DigestTileProvider[],
  since: Date,
): Promise<DigestTile[]> {
  const results = await Promise.all(
    providers.map(async (p): Promise<DigestTile[]> => {
      try {
        const out = await p.tiles({ since });
        return out === null ? [] : Array.isArray(out) ? out : [out];
      } catch (e) {
        return [
          {
            key: p.key,
            group: p.group ?? "system",
            label: p.label,
            value: "Couldn't check",
            detail: e instanceof Error ? e.message.slice(0, 120) : "Unknown error",
            tone: "warn",
          },
        ];
      }
    }),
  );
  return results.flat();
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** The ops API's own tiles, from the rest of the digest. */
export function builtInTiles(d: Omit<OpsDigest, "tiles" | "summary" | "process"> & { summary: Pick<OpsDigest["summary"], "new_issues" | "regressed_issues" | "open_issues"> }, expectAlerting: boolean): DigestTile[] {
  const tiles: DigestTile[] = [];
  const failing = d.health.failing;
  tiles.push({
    key: "health",
    group: "system",
    label: "Health checks",
    value: d.health.status === "ok" ? "All pass" : plural(failing.length, "failing check"),
    detail: d.health.status === "ok" ? "Every check is passing" : failing.map((c) => c.name).join(", ").slice(0, 80),
    tone: d.health.status === "ok" ? "ok" : d.health.status === "warn" ? "warn" : "bad",
  });
  if (d.alerts) {
    const a = d.alerts;
    const heartbeat = a.pipeline_stale
      ? "Heartbeat stopped"
      : a.pipeline_missing
        ? expectAlerting
          ? "Heartbeat never received"
          : "Alerting not set up here"
        : "Heartbeat recent";
    tiles.push({
      key: "alerts",
      group: "system",
      label: "Alerts",
      value: `${a.firing_unacked} firing`,
      detail: heartbeat,
      tone:
        a.firing_unacked > 0
          ? "bad"
          : a.pipeline_stale || (a.pipeline_missing && expectAlerting)
            ? "warn"
            : a.pipeline_missing
              ? "none"
              : "ok",
    });
  }
  if (d.issues) {
    const s = d.summary;
    tiles.push({
      key: "issues",
      group: "system",
      label: "Issues",
      value: s.open_issues === 0 ? "None open" : `${plural(s.open_issues, "open issue")}`,
      detail: `${s.new_issues} new · ${s.regressed_issues} regressed in window`,
      tone: s.new_issues + s.regressed_issues > 0 ? "bad" : s.open_issues > 0 ? "warn" : "ok",
    });
  }
  if (d.dependencies) {
    const dep = d.dependencies;
    const high = dep.advisories.critical + dep.advisories.high;
    tiles.push({
      key: "dependencies",
      group: "system",
      label: "Dependencies",
      value: dep.actionable > 0 ? plural(dep.actionable, "advisory", "advisories") + " to fix" : `${high} high`,
      detail: dep.stale ? "Checks are stale" : `${dep.outdated_direct} outdated · ${dep.runtime_eol_soon} runtimes near EOL`,
      tone: dep.actionable > 0 || dep.runtime_eol_soon > 0 ? "bad" : dep.stale ? "warn" : "ok",
    });
  }
  const latest = d.deploys[0];
  tiles.push({
    key: "deploys",
    group: "system",
    label: "Deploys",
    value: `${d.deploys.length} in window`,
    detail: latest ? `Latest ${latest.commit_root?.slice(0, 7) ?? ""}`.trim() : "No new builds",
    tone: "none",
  });
  return tiles;
}

/** Everything that needs a look, most severe first. */
export function attentionItems(
  d: Omit<OpsDigest, "summary" | "process"> & { summary: Omit<OpsDigest["summary"], "attention" | "needs_attention"> },
  expectAlerting: boolean,
): Attention[] {
  const items: Attention[] = [];
  const add = (kind: Attention["kind"], summary: string, tone: Attention["tone"], key: string = kind) =>
    items.push({ kind, key, summary, tone });

  if (d.health.status !== "ok") {
    add("health", `Health: ${d.health.failing.map((c) => c.name).join(", ")} failing`, d.health.status === "fail" ? "bad" : "warn");
  }
  const s = d.summary;
  if (s.open_issues > 0) {
    const first = d.issues?.new[0] ?? d.issues?.regressed[0] ?? d.issues?.open[0];
    const fresh = s.new_issues + s.regressed_issues;
    add(
      "issues",
      `${plural(s.open_issues, "open issue")}${first ? `: ${first.untrusted.title}` : ""}`,
      fresh > 0 ? "bad" : "warn",
    );
  }
  if (d.alerts) {
    if (d.alerts.firing_unacked > 0) add("alerts", `${plural(d.alerts.firing_unacked, "alert")} firing`, "bad");
    if (d.alerts.pipeline_stale) add("heartbeat", "Alerting heartbeat stopped: alerts may not reach you", "bad");
    else if (d.alerts.pipeline_missing && expectAlerting) {
      add("heartbeat", "Alerting heartbeat never received: alerts may not reach you", "warn");
    }
  }
  if (d.metrics?.flags.length) add("metrics", `Traffic looks off: ${d.metrics.flags.join(", ").replace(/_/g, " ")}`, "warn");
  if (d.dependencies) {
    const dep = d.dependencies;
    if (dep.actionable > 0) add("dependencies", `${plural(dep.actionable, "dependency advisory", "dependency advisories")} to fix`, "bad");
    if (dep.runtime_eol_soon > 0) add("dependencies", `${plural(dep.runtime_eol_soon, "runtime")} near end of life`, "warn");
    if (dep.stale) add("dependencies", "Dependency checks are stale", "warn");
  }
  const severeTemplates = d.logs?.new_templates.filter((t) => t.level === "error" || t.level === "warn").length ?? 0;
  if (severeTemplates > 0) add("logs", `${plural(severeTemplates, "new kind", "new kinds")} of warning or error in the logs`, "warn");
  for (const t of d.tiles) {
    if (t.tone === "bad" && !["health", "alerts", "issues", "dependencies"].includes(t.key)) {
      add("tile", `${t.label}: ${t.value}`, "bad", t.key);
    }
  }
  return items.sort((a, b) => (a.tone === b.tone ? 0 : a.tone === "bad" ? -1 : 1));
}
