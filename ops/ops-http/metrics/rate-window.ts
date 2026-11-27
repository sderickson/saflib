const UNIT_SECONDS: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86_400, w: 604_800, y: 31_536_000 };

/**
 * Widens range selectors (`[5m]`) shorter than a range query's step, so
 * each point covers the whole gap since the previous one (Grafana's
 * `$__rate_interval` idea). Without it, `rate(x[5m])` sampled every 12
 * minutes only sees 5 of each 12, and periodic traffic shows up as spikes
 * or vanishes. Subqueries (`[1h:5m]`) and compound durations are left as
 * written.
 */
export function widenRangeSelectors(query: string, stepSeconds: number): string {
  // One scrape interval (assumed 60s) on top of the step, as Grafana does.
  const minimum = Math.ceil((stepSeconds + 60) / 60) * 60;
  return query.replace(/\[(\d+)([smhdwy])\]/g, (whole, n: string, unit: string) => {
    const seconds = Number(n) * UNIT_SECONDS[unit]!;
    return seconds >= minimum ? whole : `[${minimum / 60}m]`;
  });
}
