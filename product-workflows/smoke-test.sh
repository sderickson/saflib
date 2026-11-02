#!/usr/bin/env bash
# End-to-end check of product/init (new engine) and the deploy templates.
#
# Bootstraps a throwaway product repo from this saflib checkout the way
# saf-create does (copying the working tree instead of cloning, like
# product/create/repro-local.sh), adds a second product as a satellite of
# the first (the "platform already exists" path and --identity), then checks
# the result: the satellite's shape, typecheck, unit
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
  // Not under example.com: product/init rewrites the template's example.com.
  domain: '${FIRST}.test',
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

step "Adding a second product (${SECOND}) as a satellite of ${FIRST}"
npm exec new-workflow -- run-scripts product/init --name="${SECOND}" --identity="${FIRST}"

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

step "Satellite shape"
# ${SECOND} uses ${FIRST}'s sign-in and account sites and lives under its domain.
for path in "${SECOND}/clients/auth" "${SECOND}/clients/account" "${SECOND}/service/kratos-handlers"; do
  [ ! -e "${path}" ] || { echo "a satellite shouldn't have ${path}" >&2; exit 1; }
done
grep -q "from \"@${FIRST}/${FIRST}-links\"" "${SECOND}/clients/links/index.ts" \
  || { echo "${SECOND}'s links don't use ${FIRST}'s sign-in" >&2; exit 1; }
grep -q "^DOMAIN=${FIRST}.test$" "${SECOND}/deploy/remote-assets/caddy/${SECOND}.env" \
  || { echo "${SECOND}'s routes aren't under ${FIRST}'s domain" >&2; exit 1; }
grep -q "https://app.${SECOND}.${FIRST}.test/" deploy/kratos/kratos.yml \
  || { echo "the platform's Kratos doesn't allow ${SECOND}'s hosts" >&2; exit 1; }
if grep -q "kratos.{\$DOMAIN}" "${SECOND}/deploy/remote-assets/caddy/${SECOND}.Caddyfile"; then
  echo "a satellite shouldn't route kratos.; its owner's platform does" >&2
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
# The satellite's dev stack includes its owner's.
(cd "${SECOND}/dev" && touch .env && docker compose config -q && echo "ok ${SECOND}/dev (with ${FIRST}'s dev stack)")

if [ "${SMOKE_SKIP_EDGE:-}" = 1 ]; then
  echo "Skipping the edge check (SMOKE_SKIP_EDGE=1)."
  exit 0
fi

step "Registering the platform's and both products' routes with the edge"
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
# The platform's own route (the Kratos public API), then both products'.
for dir in deploy "${FIRST}/deploy" "${SECOND}/deploy"; do
  (cd "${dir}" && npx saf-deploy register-sites --local)
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
