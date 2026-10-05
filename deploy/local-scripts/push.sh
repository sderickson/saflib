#!/bin/bash
set -euo pipefail

# Push the production images to the container registry. Rebuilds nothing that
# is up to date; already-pushed images are only retagged.
exec ./deploy/local-scripts/build.sh "${1:-amd64}" --push
