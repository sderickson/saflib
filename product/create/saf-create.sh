#!/usr/bin/env bash
set -euo pipefail

CREATE_FILES=(run.ts cli.ts bootstrap.ts constants.ts version.ts)

node_major="$(node -p 'Number(process.versions.node.split(".")[0])')"
if [ "$node_major" -lt 26 ]; then
  echo "saf-create requires Node.js 26+ (current: $(node -v))" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "${SCRIPT_DIR}/run.ts" ]; then
  exec node --experimental-strip-types --disable-warning=ExperimentalWarning \
    "${SCRIPT_DIR}/run.ts" "$@"
fi

CREATE_REF="${SAFLIB_CREATE_REF:-}"
SAFLIB_REF=""

args=("$@")
i=0
while [ "$i" -lt "${#args[@]}" ]; do
  arg="${args[$i]}"
  case "$arg" in
    --create-ref=*)
      CREATE_REF="${arg#*=}"
      unset "args[$i]"
      ;;
    --create-ref)
      next=$((i + 1))
      CREATE_REF="${args[$next]:?--create-ref requires a value}"
      unset "args[$i]" "args[$next]"
      i=$next
      ;;
    --saflib-ref=*)
      SAFLIB_REF="${arg#*=}"
      ;;
    --saflib-ref)
      next=$((i + 1))
      SAFLIB_REF="${args[$next]:?--saflib-ref requires a value}"
      i=$next
      ;;
  esac
  i=$((i + 1))
done

if [ -z "$CREATE_REF" ]; then
  CREATE_REF="${SAFLIB_REF:-main}"
fi

remaining=()
for arg in "${args[@]}"; do
  [ -n "$arg" ] && remaining+=("$arg")
done

BASE="https://raw.githubusercontent.com/sderickson/saflib/${CREATE_REF}/product/create"
DIR="$(mktemp -d)"
trap 'rm -rf "$DIR"' EXIT

for file in "${CREATE_FILES[@]}"; do
  if ! curl -fsSL "${BASE}/${file}" -o "${DIR}/${file}"; then
    echo "Failed to download ${BASE}/${file}" >&2
    echo "Tip: pass --create-ref <branch> (defaults to --saflib-ref or main)." >&2
    exit 1
  fi
done

exec node --experimental-strip-types --disable-warning=ExperimentalWarning \
  "${DIR}/run.ts" "${remaining[@]}"
