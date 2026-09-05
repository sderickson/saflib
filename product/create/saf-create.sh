#!/usr/bin/env bash
set -euo pipefail

CREATE_REF="${SAFLIB_CREATE_REF:-main}"
CREATE_FILES=(run.ts cli.ts bootstrap.ts constants.ts version.ts)

node_major="$(node -p 'Number(process.versions.node.split(".")[0])')"
if [ "$node_major" -lt 26 ]; then
  echo "saf-create requires Node.js 26+ (current: $(node -v))" >&2
  exit 1
fi

while [ $# -gt 0 ]; do
  case "$1" in
    --create-ref=*)
      CREATE_REF="${1#*=}"
      shift
      ;;
    --create-ref)
      CREATE_REF="${2:?--create-ref requires a value}"
      shift 2
      ;;
    *)
      break
      ;;
  esac
done

BASE="https://raw.githubusercontent.com/sderickson/saflib/${CREATE_REF}/product/create"
DIR="$(mktemp -d)"
trap 'rm -rf "$DIR"' EXIT

for file in "${CREATE_FILES[@]}"; do
  curl -fsSL "${BASE}/${file}" -o "${DIR}/${file}"
done

exec node --experimental-strip-types --disable-warning=ExperimentalWarning \
  "${DIR}/run.ts" "$@"
