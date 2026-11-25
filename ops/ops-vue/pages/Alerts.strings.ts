export const ops_alerts = {
  documentTitle: "Alerts",
  title: "Alerts",
  intro:
    "Alerts from the host's Prometheus rules. Acknowledging one stops it counting as needing attention until it fires again. Resolve one by hand only if Alertmanager never will (e.g. its host is gone); if it's still firing, it comes back.",
  tabFiring: "Firing",
  tabRecent: "Last 7 days",
  empty: "Nothing here.",
  started: "Started",
  ended: "Ended",
  ack: "Acknowledge",
  acked: "Acknowledged",
  resolved: "resolved",
  resolve: "Resolve",
  resolvedBy: "Resolved by",
  resolveConfirm:
    "Resolve this alert by hand? Do this only for alerts Alertmanager will never resolve, such as ones from a host that's gone. If it is still firing, it will come back on the next delivery.",
};
