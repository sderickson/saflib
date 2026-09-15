#!/bin/sh
set -e

# /repo/node_modules is a container-local named volume (see
# docker-compose.yaml's `repo_node_modules`), not the host's own tree — an
# agent's `npm install` (e.g. fixing a missing package) or any other
# workflow step touching it must never corrupt the host's (Darwin) native
# bindings, and a Linux install here would do exactly that if it shared
# the host's copy. Runs once per container start; a fast no-op once
# package-lock.json is already satisfied.
#
# Needs a moment as root: a fresh named volume is root-owned, and the
# `node` user (which the rest of this image, and the app itself, runs as
# — see Dockerfile.template) can't write into it otherwise.
if [ -d /repo ]; then
  mkdir -p /repo/node_modules
  chown -R node:node /repo/node_modules
  su node -c 'cd /repo && npm install --include=dev'
fi

exec su node -c "cd $(pwd) && $*"
