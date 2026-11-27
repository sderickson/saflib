/** Starter queries for Analytics → Explore. */
export const savedAnalyticsQueries: { label: string; sql: string }[] = [
  {
    label: "Events, last 7 days",
    sql: `SELECT event, count(*) AS n, count(DISTINCT user_id) AS users
FROM product_events
WHERE ts > (strftime('%s', 'now') - 7 * 86400) * 1000
GROUP BY event
ORDER BY n DESC`,
  },
  {
    label: "Events per day, last 30 days",
    sql: `SELECT date(ts / 1000, 'unixepoch') AS day, event, count(*) AS n
FROM product_events
WHERE ts > (strftime('%s', 'now') - 30 * 86400) * 1000
GROUP BY day, event
ORDER BY day DESC, n DESC`,
  },
  {
    label: "Active users per week",
    sql: `SELECT strftime('%Y-W%W', ts / 1000, 'unixepoch') AS week, count(DISTINCT user_id) AS users, count(*) AS events
FROM product_events
WHERE user_id IS NOT NULL
GROUP BY week
ORDER BY week DESC`,
  },
  {
    label: "Latest events with properties",
    sql: `SELECT datetime(ts / 1000, 'unixepoch') AS at, event, user_id, json_extract(fields, '$.context') AS properties, request_id
FROM product_events
ORDER BY id DESC
LIMIT 100`,
  },
  {
    label: "Warnings and errors by message, last day",
    sql: `SELECT t.template, l.level, count(*) AS n
FROM log_entries l JOIN log_templates t ON t.hash = l.template_hash
WHERE l.level_num <= 1 AND l.ts > (strftime('%s', 'now') - 86400) * 1000
GROUP BY t.template, l.level
ORDER BY n DESC
LIMIT 50`,
  },
];
