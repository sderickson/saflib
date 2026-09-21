#!/bin/bash

cd $REMOTE_ASSETS_FOLDER_PATH
# Force recreate so bind mounts (e.g. ./kratos) reattach after sync replaces
# directory trees. Without this, long-lived containers keep stale mount inodes
# and fail with missing config files like identity.schema.json.
CONTAINER_REGISTRY=$CONTAINER_REGISTRY docker compose -f docker-compose.prod.yaml up -d --force-recreate --remove-orphans
docker system prune -f
