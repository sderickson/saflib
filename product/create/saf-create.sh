#!/usr/bin/env bash
set -euo pipefail

CREATE_FILES=(run.ts cli.ts bootstrap.ts constants.ts version.ts)

node_major="$(node -p 'Number(process.versions.node.split(".")[0])')"
if [ "$node_major" -lt 26 ]; then
  echo "saf-create requires Node.js 26+ (current: $(node -v))" >&2
  exit 1
fi

CREATE_REF="${SAFLIB_CREATE_REF:-}"
prev=""
for arg in "$@"; do
  if [ "$prev" = "--saflib-ref" ]; then
    if [ -z "$CREATE_REF" ]; then
      CREATE_REF="$arg"
    fi
  fi
  case "$arg" in
    --saflib-ref=*)
      if [ -z "$CREATE_REF" ]; then
        CREATE_REF="${arg#*=}"
      fi
      ;;
  esac
  prev="$arg"
done

CREATE_REF="${CREATE_REF:-main}"

BASE="https://raw.githubusercontent.com/sderickson/saflib/${CREATE_REF}/product/create"
DIR="$(mktemp -d)"
trap 'rm -rf "$DIR"' EXIT

for file in "${CREATE_FILES[@]}"; do
  if ! curl -fsSL "${BASE}/${file}" -o "${DIR}/${file}"; then
    echo "Failed to download ${BASE}/${file}" >&2
    echo "Tip: set SAFLIB_CREATE_REF or pass --saflib-ref (defaults to main)." >&2
    exit 1
  fi
done

exec node --experimental-strip-types --disable-warning=ExperimentalWarning \
  "${DIR}/run.ts" "$@"
