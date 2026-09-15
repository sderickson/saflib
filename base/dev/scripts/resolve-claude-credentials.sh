#!/usr/bin/env bash
# Writes ./.claude-credentials.json from the host's Claude Code OAuth session,
# so the dev-site container's `claude` CLI can reuse it instead of needing its
# own login or a metered API key. Bind-mounted read-write into the container
# at /root/.claude/.credentials.json (see docker-compose.yaml).
#
# macOS stores the session in Keychain, not a file — this reads it out.
# Linux stores it as a plain file already (no OS keychain), so it's just
# copied. Never prints the credential value; failures are soft (an empty
# placeholder is written) so `docker compose up` still proceeds without it —
# workflow "update" steps that need an agent just won't authenticate.
set -euo pipefail

DEV_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$DEV_DIR/.claude-credentials.json"

write_placeholder() {
  echo '{}' > "$OUT"
  chmod 600 "$OUT"
}

case "$(uname -s)" in
  Darwin)
    if security find-generic-password -a "$USER" -s "Claude Code-credentials" -w > "$OUT" 2>/dev/null; then
      chmod 600 "$OUT"
      echo "dev-site: wrote Claude Code credentials from macOS Keychain -> $(basename "$OUT")" >&2
    else
      write_placeholder
      echo "dev-site: no Claude Code Keychain entry found (run 'claude login' on host, then re-run this) — wrote empty placeholder" >&2
    fi
    ;;
  Linux)
    if [[ -f "$HOME/.claude/.credentials.json" ]]; then
      cp "$HOME/.claude/.credentials.json" "$OUT"
      chmod 600 "$OUT"
      echo "dev-site: wrote Claude Code credentials from ~/.claude/.credentials.json -> $(basename "$OUT")" >&2
    else
      write_placeholder
      echo "dev-site: no ~/.claude/.credentials.json found (run 'claude login' on host, then re-run this) — wrote empty placeholder" >&2
    fi
    ;;
  *)
    write_placeholder
    echo "dev-site: unsupported host OS for Claude credential extraction — wrote empty placeholder" >&2
    ;;
esac
