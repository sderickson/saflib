cd "$REMOTE_ASSETS_FOLDER_PATH"
docker_cmd compose -f docker-compose.prod.yaml logs -f --tail 100
