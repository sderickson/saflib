#!/usr/bin/env bash
# End-to-end check of product/init (new engine) and the deploy templates.
#
# Bootstraps a throwaway product repo from this saflib checkout the way
# saf-create does (copying the working tree instead of cloning, like
# product/create/repro-local.sh), adds a second product to exercise the
# "platform already exists" path, then checks the result: typecheck, unit
# tests, docker build inputs, every deploy's compose config, and (unless
# SMOKE_SKIP_EDGE=1) both products registering their routes with a running
# platform edge.
#
# Usage: product-workflows/smoke-test.sh [work-dir]
set -euo pipefail

SAFLIB_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK="${1:-${TMPDIR:-/tmp}/saf-product-smoke}"
FIRST=acme
SECOND=notes

step() { printf '\n== %s\n' "$*"; }

step "Bootstrapping ${FIRST} in ${WORK}"
rm -rf "${WORK}"
mkdir -p "${WORK}"
cd "${WORK}"
git init -q
git config user.email smoke@example.com
git config user.name "Smoke Test"

node --experimental-strip-types --disable-warning=ExperimentalWarning --input-type=module -e "
import { execSync } from 'node:child_process';
import { runBootstrap } from '${SAFLIB_ROOT}/product/create/bootstrap.ts';
runBootstrap({
  cwd: '${WORK}',
  productName: '${FIRST}',
  domain: '${FIRST}.example.com',
  organizationName: '${FIRST}',
  saflibRef: 'HEAD',
  runCommand: (command, { cwd }) => {
    if (command.startsWith('git submodule add')) {
      execSync(
        'rsync -a --exclude node_modules --exclude .git --exclude \"/tmp/\" ${SAFLIB_ROOT}/ saflib/',
        { cwd, stdio: 'inherit', shell: true },
      );
      return;
    }
    if (command.startsWith('git -C saflib checkout')) return;
    execSync(command, { cwd, stdio: 'inherit', shell: true });
  },
});
"

step "Adding a second product (${SECOND}) to the existing platform"
npm exec new-workflow -- run-scripts product/init --name="${SECOND}" --domain="${SECOND}.example.com"

step "Checking the layout"
for path in deploy/package.json "${FIRST}/deploy/package.json" "${SECOND}/deploy/package.json" \
  "${FIRST}/deploy/remote-assets/caddy/${FIRST}.Caddyfile" "${SECOND}/deploy/remote-assets/caddy/${SECOND}.Caddyfile" \
  "${FIRST}/deploy/remote-assets/.env.${FIRST}.secrets" deploy/remote-assets/.env.kratos.secrets; do
  [ -e "${path}" ] || { echo "missing: ${path}" >&2; exit 1; }
done
if grep -rn --include='*' -l -E '__product-name__|base/product|base/platform' "${FIRST}" "${SECOND}" deploy \
  --exclude-dir=node_modules --exclude-dir=dist 2>/dev/null; then
  echo "unreplaced template references (above)" >&2
  exit 1
fi

step "Dependency alignment"
# product/init runs this too; repeated here so CI reports it by name.
node --experimental-strip-types --disable-warning=ExperimentalWarning saflib/docker/dev/check-dependency-alignment.ts
if grep -q '"preinstall"' package.json; then
  echo "package.json has a preinstall hook; product repos shouldn't get one" >&2
  exit 1
fi

step "Typecheck"
npm run typecheck

step "Unit tests"
# The root vitest config lists only the products' projects (product/init adds them).
npx vitest run

step "Docker build inputs"
# The repo's own builds; saflib's golden template builds only build in saflib.
npx saf-docker status --dir deploy --dir "${FIRST}" --dir "${SECOND}"

step "Deploy compose configs"
export CONTAINER_REGISTRY=smoke.local
for dir in deploy "${FIRST}/deploy" "${SECOND}/deploy"; do
  (cd "${dir}" && docker compose -f docker-compose.prod-local.yaml config -q && echo "ok ${dir}")
done

if [ "${SMOKE_SKIP_EDGE:-}" = 1 ]; then
  echo "Skipping the edge check (SMOKE_SKIP_EDGE=1)."
  exit 0
fi

step "Registering both products' routes with the platform edge"
edge_image=$(cd deploy && docker compose -f docker-compose.prod-local.yaml config --images | grep caddy)
npx saf-docker build "@${FIRST}/deploy/builds/caddy" --platform native
docker tag "${edge_image#smoke.local/}" "${edge_image}"
# No host ports: registration goes through `docker exec`, and this way the
# check runs beside a dev stack that already holds :80.
cat > "${WORK}/edge-no-ports.yaml" <<'EOF'
services:
  caddy:
    ports: !reset []
EOF
edge_compose() { (cd "${WORK}/deploy" && docker compose -f docker-compose.prod-local.yaml -f "${WORK}/edge-no-ports.yaml" "$@"); }
cleanup() { edge_compose down -v > /dev/null 2>&1 || true; }
trap cleanup EXIT
edge_compose up -d caddy
for product in "${FIRST}" "${SECOND}"; do
  (cd "${product}/deploy" && npx saf-deploy register-sites --local)
done
# A broken route is rejected and rolled back, leaving the edge serving.
echo "this is not caddyfile syntax {" >> "${SECOND}/deploy/remote-assets/caddy/${SECOND}.Caddyfile"
if (cd "${SECOND}/deploy" && npx saf-deploy register-sites --local); then
  echo "the edge accepted a broken route" >&2
  exit 1
fi
edge=$(edge_compose ps -q caddy)
docker exec "${edge}" caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile

step "Smoke test passed"
