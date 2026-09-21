#!/usr/bin/env bash
# Writes ./.cursor-auth.json from the host's Cursor Agent login, so the
# dev-site container's `cursor-agent` CLI can reuse it. Bind-mounted into
# the container at /home/node/.config/cursor/auth.json with
# AGENT_CLI_CREDENTIAL_STORE=file (see docker-compose.yaml) — Linux has no
# Keychain, so the file store is required inside the container.
#
# macOS stores the session in Keychain (`cursor-access-token` /
# `cursor-refresh-token`). Linux (and AGENT_CLI_CREDENTIAL_STORE=file on
# any host) stores it as ~/.config/cursor/auth.json or ~/.cursor/auth.json.
# Soft-fail: an empty placeholder is written so `docker compose up` still
# proceeds without it — workflow "update" steps that need an agent just
# won't authenticate.
set -euo pipefail

DEV_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$DEV_DIR/.cursor-auth.json"

write_placeholder() {
  echo '{}' > "$OUT"
  chmod 600 "$OUT"
}

write_from_tokens() {
  local access="$1"
  local refresh="$2"
  if [[ -z "$access" || -z "$refresh" ]]; then
    return 1
  fi
  # Match the shape FileAuthStore.writeAuthData expects (see cursor-agent).
  python3 -c '
import json, sys
access, refresh = sys.argv[1], sys.argv[2]
json.dump({"accessToken": access, "refreshToken": refresh}, sys.stdout)
' "$access" "$refresh" > "$OUT"
  chmod 600 "$OUT"
}

case "$(uname -s)" in
  Darwin)
    if ACCESS="$(security find-generic-password -a "cursor-user" -s "cursor-access-token" -w 2>/dev/null)" \
      && REFRESH="$(security find-generic-password -a "cursor-user" -s "cursor-refresh-token" -w 2>/dev/null)" \
      && write_from_tokens "$ACCESS" "$REFRESH"; then
      echo "dev-site: wrote Cursor Agent credentials from macOS Keychain -> $(basename "$OUT")" >&2
    elif [[ -f "$HOME/.cursor/auth.json" ]]; then
      cp "$HOME/.cursor/auth.json" "$OUT"
      chmod 600 "$OUT"
      echo "dev-site: wrote Cursor Agent credentials from ~/.cursor/auth.json -> $(basename "$OUT")" >&2
    else
      write_placeholder
      echo "dev-site: no Cursor Agent Keychain entry found (run 'cursor-agent login' on host, then re-run this) — wrote empty placeholder" >&2
    fi
    ;;
  Linux)
    if [[ -f "${XDG_CONFIG_HOME:-$HOME/.config}/cursor/auth.json" ]]; then
      cp "${XDG_CONFIG_HOME:-$HOME/.config}/cursor/auth.json" "$OUT"
      chmod 600 "$OUT"
      echo "dev-site: wrote Cursor Agent credentials from ~/.config/cursor/auth.json -> $(basename "$OUT")" >&2
    elif [[ -f "$HOME/.cursor/auth.json" ]]; then
      cp "$HOME/.cursor/auth.json" "$OUT"
      chmod 600 "$OUT"
      echo "dev-site: wrote Cursor Agent credentials from ~/.cursor/auth.json -> $(basename "$OUT")" >&2
    else
      write_placeholder
      echo "dev-site: no Cursor Agent auth.json found (run 'cursor-agent login' on host, then re-run this) — wrote empty placeholder" >&2
    fi
    ;;
  *)
    write_placeholder
    echo "dev-site: unsupported host OS for Cursor credential extraction — wrote empty placeholder" >&2
    ;;
esac
