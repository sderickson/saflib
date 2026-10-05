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
#
# Soft-fail: an empty placeholder is written so `docker compose up` still
# proceeds without credentials — but expired tokens are detected and
# refused (cursor-agent `status` can still say "logged in" with a dead
# session; `-p` then fails with "Authentication required").
set -euo pipefail

DEV_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$DEV_DIR/.cursor-auth.json"

write_placeholder() {
  echo '{}' > "$OUT"
  chmod 600 "$OUT"
}

# Returns 0 if the JWT (or opaque token) looks usable. JWTs with an `exp`
# claim in the past are rejected — Keychain/status can still look "logged
# in" while `-p` fails.
tokens_look_valid() {
  local access="$1"
  local refresh="$2"
  python3 -c '
import base64, json, sys, time

def jwt_exp(tok: str):
    parts = tok.split(".")
    if len(parts) != 3:
        return None
    pad = parts[1] + "=" * (-len(parts[1]) % 4)
    try:
        payload = json.loads(base64.urlsafe_b64decode(pad))
    except Exception:
        return None
    exp = payload.get("exp")
    return int(exp) if isinstance(exp, (int, float)) else None

access, refresh = sys.argv[1], sys.argv[2]
now = int(time.time())
# Prefer refresh-token expiry when both are JWTs; fall back to access.
for label, tok in (("refresh", refresh), ("access", access)):
    exp = jwt_exp(tok)
    if exp is None:
        continue
    if exp <= now + 60:
        print(f"expired {label} token (exp={exp}, now={now})", file=sys.stderr)
        sys.exit(1)
    sys.exit(0)
# Non-JWT tokens: accept and let the CLI decide.
sys.exit(0)
' "$access" "$refresh"
}

write_from_tokens() {
  local access="$1"
  local refresh="$2"
  if [[ -z "$access" || -z "$refresh" ]]; then
    return 1
  fi
  if ! tokens_look_valid "$access" "$refresh"; then
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

write_from_auth_file() {
  local src="$1"
  local access refresh
  access="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1])).get("accessToken") or "")' "$src")"
  refresh="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1])).get("refreshToken") or "")' "$src")"
  write_from_tokens "$access" "$refresh"
}

case "$(uname -s)" in
  Darwin)
    if ACCESS="$(security find-generic-password -a "cursor-user" -s "cursor-access-token" -w 2>/dev/null)" \
      && REFRESH="$(security find-generic-password -a "cursor-user" -s "cursor-refresh-token" -w 2>/dev/null)" \
      && write_from_tokens "$ACCESS" "$REFRESH"; then
      echo "dev-site: wrote Cursor Agent credentials from macOS Keychain -> $(basename "$OUT")" >&2
    elif [[ -f "$HOME/.cursor/auth.json" ]] && write_from_auth_file "$HOME/.cursor/auth.json"; then
      echo "dev-site: wrote Cursor Agent credentials from ~/.cursor/auth.json -> $(basename "$OUT")" >&2
    else
      write_placeholder
      echo "dev-site: Cursor Agent credentials missing or expired (run 'cursor-agent login' on host, then re-run this) — wrote empty placeholder" >&2
    fi
    ;;
  Linux)
    if [[ -f "${XDG_CONFIG_HOME:-$HOME/.config}/cursor/auth.json" ]] \
      && write_from_auth_file "${XDG_CONFIG_HOME:-$HOME/.config}/cursor/auth.json"; then
      echo "dev-site: wrote Cursor Agent credentials from ~/.config/cursor/auth.json -> $(basename "$OUT")" >&2
    elif [[ -f "$HOME/.cursor/auth.json" ]] && write_from_auth_file "$HOME/.cursor/auth.json"; then
      echo "dev-site: wrote Cursor Agent credentials from ~/.cursor/auth.json -> $(basename "$OUT")" >&2
    else
      write_placeholder
      echo "dev-site: Cursor Agent credentials missing or expired (run 'cursor-agent login' on host, then re-run this) — wrote empty placeholder" >&2
    fi
    ;;
  *)
    write_placeholder
    echo "dev-site: unsupported host OS for Cursor credential extraction — wrote empty placeholder" >&2
    ;;
esac
