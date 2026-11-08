import client from "prom-client";

function counter(name: string, help: string, labelNames: string[]) {
  return (
    (client.register.getSingleMetric(name) as client.Counter<string> | undefined) ??
    new client.Counter({ name, help, labelNames })
  );
}

/** Every recorded occurrence. */
export const issueOccurrencesTotal = counter(
  "saf_issue_occurrences_total",
  "Issue occurrences recorded",
  ["level", "kind"],
);

/** Issues seen for the first time. Alert on error/fatal. */
export const issueNewGroupsTotal = counter("saf_issue_new_groups_total", "New issues", ["level", "kind"]);

/** Resolved issues seen again. */
export const issueRegressionsTotal = counter("saf_issue_regressions_total", "Issues regressed", ["level"]);
