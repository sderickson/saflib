import { computed } from "vue";
import { useOpsDigest } from "../requests/queries.ts";

/**
 * Sidebar badge counts from the Overview's digest (the same cached query, so
 * no extra requests): how many things need attention, new issues, and the
 * leading number of any tile (e.g. "3 awaiting reply" → 3) by tile key.
 */
export function useAdminBadges() {
  const query = useOpsDigest();
  return computed(() => {
    const d = query.data.value?.digest;
    if (!d) return { attention: 0, attentionBad: false, newIssues: 0, tiles: {} as Record<string, number> };
    const tiles: Record<string, number> = {};
    for (const t of d.tiles) {
      const n = Number.parseInt(t.value, 10);
      if (Number.isFinite(n) && n > 0 && (t.tone === "warn" || t.tone === "bad")) tiles[t.key] = n;
    }
    return {
      attention: d.summary.attention.length,
      attentionBad: d.summary.attention.some((a) => a.tone === "bad"),
      newIssues: d.summary.new_issues + d.summary.regressed_issues,
      tiles,
    };
  });
}
