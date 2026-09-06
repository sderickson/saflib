#!/usr/bin/env bash
# Local bootstrap repro — creates a throwaway product repo under $TMPDIR
# using a symlink to this saflib checkout (live code, no GitHub clone).
#
# Uses /tmp (or $TMPDIR) so the product is not nested inside saf-2025;
# that avoids npm picking up the parent repo's node_modules during installs
# and tests.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SAFLIB_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
TMP_ROOT="${TMPDIR:-/tmp}"
TEST_DIR="${TMP_ROOT}/saf-bootstrap-test-${1:-testprod}"
PRODUCT_NAME="${1:-testprod}"
DOMAIN="${2:-testprod.com}"

echo "saflib: ${SAFLIB_ROOT}"
echo "test dir: ${TEST_DIR}"

rm -rf "${TEST_DIR}"
mkdir -p "${TEST_DIR}"
cd "${TEST_DIR}"
git init -q

node --experimental-strip-types --disable-warning=ExperimentalWarning -e "
import { execSync } from 'node:child_process';
import { runBootstrap } from '${SAFLIB_ROOT}/product/create/bootstrap.ts';

const cwd = '${TEST_DIR}';
const saflibPath = '${SAFLIB_ROOT}';

runBootstrap({
  cwd,
  productName: '${PRODUCT_NAME}',
  domain: '${DOMAIN}',
  organizationName: '${PRODUCT_NAME}',
  saflibRef: 'HEAD',
  saflibPath,
  runCommand: (command, { cwd }) => {
    if (command.startsWith('git submodule add')) {
      execSync('ln -sfn ${SAFLIB_ROOT} saflib', { cwd, stdio: 'inherit' });
      return;
    }
    if (command.startsWith('git -C saflib checkout')) {
      return;
    }
    execSync(command, { cwd, stdio: 'inherit', shell: true });
  },
});
"
