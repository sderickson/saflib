#!/usr/bin/env bash
# Local (non-Docker) smoke: API on :3099 + Vite on :5199
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$ROOT"

export NODE_ENV=development
export TZ=UTC
export DEPLOYMENT_NAME=development
export DOMAIN=localhost
export PROTOCOL=http
export CLIENT_SUBDOMAINS=""
export ADMIN_EMAILS=admin@saflib.com
export ALLOW_DB_CREATION=true
export DEV_SITE_SERVICE_HTTP_HOST=0.0.0.0:3099
export DEV_SITE_REPO_ROOT="$ROOT"
export DEV_SITE_PRODUCT_ROOT=base
export DEV_SITE_MAIN_REF=main
export DEV_SITE_DB_PATH="$ROOT/base/dev-site/service/http/data/dev-site.sqlite"

cleanup() {
  if [[ -n "${API_PID:-}" ]]; then kill "$API_PID" 2>/dev/null || true; fi
  if [[ -n "${WEB_PID:-}" ]]; then kill "$WEB_PID" 2>/dev/null || true; fi
}
trap cleanup EXIT

npm start -w @saflib/base-dev-site-http &
API_PID=$!

for i in $(seq 1 40); do
  if curl -sf "http://127.0.0.1:3099/api/commits" >/dev/null 2>&1; then
    break
  fi
  sleep 0.25
done

npm run dev -w @saflib/base-dev-site-app &
WEB_PID=$!

echo ""
echo "Dev-site local:"
echo "  UI  http://127.0.0.1:5199"
echo "  API http://127.0.0.1:3099/api/commits"
echo ""
wait
