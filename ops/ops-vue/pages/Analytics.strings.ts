export const ops_analytics = {
  explore_title: "Analytics: explore",
  trends_title: "Analytics: trends",
  sql_label: "SQL (read-only, logs DB)",
  run: "Run",
  run_hint: "⌘/Ctrl + Enter",
  saved: "Saved queries",
  rows: (n: number, truncated: boolean, ms: number) =>
    `${n.toLocaleString()}${truncated ? "+" : ""} ${n === 1 && !truncated ? "row" : "rows"} · ${ms} ms${truncated ? " · showing the first 1,000" : ""}`,
  empty_result: "No rows.",
  schema_help:
    "Tables: product_events (ts, event, user_id, request_id, context_kind, context_id, fields), log_entries (every log line; event is set on product events), log_templates. ts is milliseconds since the epoch; properties are in fields: json_extract(fields, '$.key').",
  trends_off: "Prometheus isn't running here, so there's no long view. Explore has the last 180 days of events.",
  range: "Range",
  event_col: "Event",
  total_col: "Total",
  trend_col: "Trend",
  no_events: "No product events counted in this range.",
};
