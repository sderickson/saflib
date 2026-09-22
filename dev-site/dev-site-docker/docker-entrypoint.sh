#!/bin/sh
set -e

# /repo is normally a read-only bind of the host checkout (see compose). The
# site process itself runs from /app in the image and does not need a writable
# /repo/node_modules to start. If /repo/node_modules happens to be writable
# (e.g. an optional named-volume overlay), install Linux deps for agent
# workflows; otherwise skip — that is the expected path for :ro mounts.
#
# Needs a moment as root when the overlay is present: a fresh named volume is
# root-owned, and the `node` user (which the rest of this image, and the app
# itself, runs as — see Dockerfile.template) can't write into it otherwise.
if [ -d /repo ]; then
  mkdir -p /repo/node_modules
  if touch /repo/node_modules/.writecheck 2>/dev/null; then
    rm -f /repo/node_modules/.writecheck
    chown -R node:node /repo/node_modules
    su node -c 'cd /repo && npm install --include=dev'
  else
    echo "dev-site: /repo/node_modules is not writable (read-only /repo mount); skipping chown/npm install" >&2
  fi
fi

# Same story for /data/new-workflows (see docker-compose.yaml's
# `new_workflows_data`): a fresh named volume mount is root-owned, and
# @saflib/new-workflows-db's sqlite file lives there instead of on the
# bind-mounted /repo (see routes/workflows/index.ts).
if [ -d /data/new-workflows ]; then
  chown -R node:node /data/new-workflows
fi

exec su node -c "cd $(pwd) && $*"
