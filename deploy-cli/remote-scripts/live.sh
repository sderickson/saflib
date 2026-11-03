# Shows the live blue-green color and each color's containers (prefixed with
# sites.sh).
cd "$REMOTE_ASSETS_FOLDER_PATH"
if ! bg_enabled; then
  echo "This deploy has no blue-green services ($(bg_file))."
  exit 0
fi
echo "Live color: $(live_color)"
for color in blue green; do
  for service in $(bg_services); do
    status=$(docker_cmd inspect -f '{{.State.Status}} {{if .State.Health}}{{.State.Health.Status}}{{end}} {{.Config.Image}}' "$service-$color" 2>/dev/null) || status="not running"
    echo "  $service-$color: $status"
  done
done
