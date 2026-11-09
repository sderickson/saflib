#!/bin/sh
# Host package updates as Prometheus metrics, for node-exporter's textfile
# collector. Runs in a busybox sidecar with the host's / mounted read-only at
# /host, and asks the host's own apt what an upgrade would install:
#
#   chroot /host apt-get -s dist-upgrade
#
# `-s` only simulates: no root needed on the host side, no locks taken
# (Debug::NoLocking), nothing written. Package lists come from the host's
# apt-daily.timer (on by default on Debian and Ubuntu); a stale-lists metric
# says when that stops.
#
# The container needs only CAP_SYS_CHROOT, no network, and a tmpfs over
# /host/tmp (apt writes temp files while reading signed lists).
#
# Writes $OUT_DIR/saf_host_apt.prom every $INTERVAL seconds (default 1h):
#   saf_apt_upgrades_pending{kind="all"|"security"}
#   saf_apt_lists_updated_timestamp_seconds
#   saf_reboot_required
#   saf_apt_check_timestamp_seconds  (only after a successful check)
set -u
HOST=${HOST:-/host}
OUT_DIR=${OUT_DIR:-/textfile}
INTERVAL=${INTERVAL:-3600}

check() {
  if ! sim=$(chroot "$HOST" /usr/bin/apt-get -s -q -o Debug::NoLocking=1 dist-upgrade 2>/dev/null); then
    echo "host-apt-metrics: apt-get -s failed" >&2
    return 1
  fi
  # "Inst openssl [3.0.13-0ubuntu3.4] (3.0.13-0ubuntu3.5 Ubuntu:24.04/noble-security [amd64])"
  all=$(printf '%s\n' "$sim" | grep -c '^Inst ')
  security=$(printf '%s\n' "$sim" | grep '^Inst ' | grep -c -- '-security')
  lists=0
  for f in "$HOST"/var/lib/apt/lists/*_InRelease "$HOST"/var/lib/apt/lists/*_Release; do
    [ -e "$f" ] || continue
    t=$(stat -c %Y "$f")
    [ "$t" -gt "$lists" ] && lists=$t
  done
  # /var/run is a symlink to /run, which would resolve inside the container.
  reboot=0
  [ -e "$HOST/run/reboot-required" ] && reboot=1

  tmp="$OUT_DIR/.saf_host_apt.prom.$$"
  cat > "$tmp" <<EOF
# HELP saf_apt_upgrades_pending Packages a dist-upgrade would install on the host.
# TYPE saf_apt_upgrades_pending gauge
saf_apt_upgrades_pending{kind="all"} $all
saf_apt_upgrades_pending{kind="security"} $security
# HELP saf_apt_lists_updated_timestamp_seconds When the host last refreshed its package lists.
# TYPE saf_apt_lists_updated_timestamp_seconds gauge
saf_apt_lists_updated_timestamp_seconds $lists
# HELP saf_reboot_required 1 when the host needs a reboot to finish applying updates.
# TYPE saf_reboot_required gauge
saf_reboot_required $reboot
# HELP saf_apt_check_timestamp_seconds When this check last succeeded.
# TYPE saf_apt_check_timestamp_seconds gauge
saf_apt_check_timestamp_seconds $(date +%s)
EOF
  mv "$tmp" "$OUT_DIR/saf_host_apt.prom"
}

while :; do
  check
  sleep "$INTERVAL"
done
