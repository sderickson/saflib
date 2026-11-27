export const ops_backups = {
  page_title: "Backups",
  not_configured:
    "This product doesn't make its own backups yet (no backups store configured). The host's disk snapshots are the only copy.",
  back_up_now: "Back up now",
  retention: (days: number | null) => (days ? `Kept ${days} days` : ""),
  weekdays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  legend: { ok: "Checked", suspicious: "Looks wrong", failed: "Failed", none: "None" },
  pick_day: "Pick a day to see its backups.",
  no_backups_day: "No backups this day.",
  tags: { daily: "Daily", deploy: "Deploy", "pre-migration": "Before migration", manual: "Manual" } as Record<string, string>,
  statuses: { ok: "Checked", suspicious: "Looks wrong", failed: "Failed", running: "Running" } as Record<string, string>,
  rows: "rows",
  tables: "Tables",
  table_list: "Per table",
  verified: (ok: boolean | null, at: string | null) =>
    at ? (ok ? `Read back ${at}: hash matches` : `Read back ${at}: hash doesn't match`) : "Not read back yet",
  migration: "Migration",
  size: "Size",
  hash: "sha256",
  change_since: "since the backup before",
};
