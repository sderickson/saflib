cd "$REMOTE_ASSETS_FOLDER_PATH"
docker_cmd compose -f docker-compose.prod.yaml down
if bg_enabled; then
  bg_remove blue
  bg_remove green
  rm -f "$(state_dir)/live"
fi
