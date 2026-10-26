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
    skip_install=
    case "${DEV_SITE_SKIP_REPO_NPM_INSTALL:-}" in 1|true|yes) skip_install=1 ;; esac
    if [ -n "$skip_install" ]; then
      echo "dev-site: skipping /repo npm install (DEV_SITE_SKIP_REPO_NPM_INSTALL)" >&2
    elif [ -f /repo/node_modules/.dev-site-deps-ready ]; then
      echo "dev-site: reusing /repo/node_modules (remove volume or .dev-site-deps-ready to reinstall)" >&2
    else
      su node -c 'cd /repo && npm install --include=dev'
      touch /repo/node_modules/.dev-site-deps-ready
    fi
  else
    echo "dev-site: /repo/node_modules is not writable (read-only /repo mount); skipping chown/npm install" >&2
  fi
fi

# Same story for /data: the sqlite files (dev-site.sqlite and
# new-workflows/local.sqlite) belong on a container-only named volume, not a
# macOS bind mount — WAL's mmap'd -shm files on the host file share can leak
# inode references and panic Docker Desktop's VM on shutdown. A fresh named
# volume mount is root-owned, so hand it to `node` before dropping to it.
if [ -d /data ]; then
  mkdir -p /data/new-workflows
  chown node:node /data
  chown -R node:node /data/new-workflows
fi

# The workflow workspace (DEV_SITE_WORKFLOW_WORKSPACE, e.g. /workspace/repo)
# and npm's cache live on named volumes too, so workflow steps get fast
# container-local disk instead of the bind-mounted checkout. Same ownership
# fix: only the top-level directories, since the node user creates
# everything beneath them.
if [ -n "${DEV_SITE_WORKFLOW_WORKSPACE:-}" ]; then
  workspace_parent="$(dirname "$DEV_SITE_WORKFLOW_WORKSPACE")"
  mkdir -p "$workspace_parent"
  chown node:node "$workspace_parent"
fi
# Likewise an optional volume for Claude Code's conversations, so agent
# sessions survive the container being recreated.
for dir in /home/node/.npm /home/node/.claude/projects; do
  if [ -d "$dir" ]; then
    chown node:node "$dir"
  fi
done

exec su node -c "cd $(pwd) && $*"
