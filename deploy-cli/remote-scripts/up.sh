cd "$REMOTE_ASSETS_FOLDER_PATH"
# Force recreate so bind mounts (e.g. ./kratos) reattach after sync replaces
# directory trees. Without this, long-lived containers keep stale mount inodes
# and fail with missing config files like identity.schema.json.
docker_cmd compose -f docker-compose.prod.yaml up -d --force-recreate --remove-orphans
docker_cmd system prune -f
