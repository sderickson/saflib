#!/bin/sh
# Apply /etc/__product-name__/env.defaults for any vars not already set (Compose
# env_file / secrets / prod-local overrides win).
set -eu

DEFAULTS="${SAF_ENV_DEFAULTS:-/etc/__product-name__/env.defaults}"

if [ -f "$DEFAULTS" ]; then
  while IFS= read -r line || [ -n "$line" ]; do
    # Trim CR (Windows) and skip blanks / comments
    line=$(printf '%s' "$line" | tr -d '\r')
    case "$line" in
      '' | \#*) continue ;;
    esac
    case "$line" in
      *=*) ;;
      *) continue ;;
    esac
    key=${line%%=*}
    value=${line#*=}
    # Strip one layer of matching surrounding quotes (Docker env-file style)
    case "$value" in
      \"*\") value=${value#\"}; value=${value%\"} ;;
      \'*\') value=${value#\'}; value=${value%\'} ;;
    esac
    if ! printenv "$key" >/dev/null 2>&1; then
      export "$key=$value"
    fi
  done <"$DEFAULTS"
fi

exec "$@"
