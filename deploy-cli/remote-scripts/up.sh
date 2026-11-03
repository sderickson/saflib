# Brings the deploy up (prefixed with sites.sh). With a
# docker-compose.blue-green.yaml, its services deploy blue-green: the idle
# color starts and must turn healthy (SAF_HEALTH_TIMEOUT, default 60s) before
# routes switch to it, then must stay healthy (SAF_WATCH_SECONDS, default 60s)
# or routes switch back. The old color is removed after a successful deploy.
cd "$REMOTE_ASSETS_FOLDER_PATH"

up_main() {
  # Nothing to do when everything deploys blue-green.
  [ -n "$(docker_cmd compose -f docker-compose.prod.yaml config --services)" ] || return 0
  # Force recreate so bind mounts (e.g. ./kratos) reattach after sync replaces
  # directory trees. Without this, long-lived containers keep stale mount inodes
  # and fail with missing config files like identity.schema.json.
  docker_cmd compose -f docker-compose.prod.yaml up -d --force-recreate --remove-orphans
}

# A first deploy brings the main stack up before the colors: it may create
# what they need (e.g. the platform's edge network), and nothing is live yet.
main_up_first=""
if [ "${SAF_DEPLOY_LOCAL:-}" != 1 ] && [ -z "$(docker_cmd compose -f docker-compose.prod.yaml ps -q)" ]; then
  up_main
  main_up_first=1
fi

live=""
new=""
if bg_enabled; then
  live=$(live_color)
  new=$(other_color "${live:-green}")
  echo "Starting the $new color (live: ${live:-none})…"
  if ! bg_compose "$new" up -d --force-recreate --wait --wait-timeout "${SAF_HEALTH_TIMEOUT:-60}"; then
    echo "The $new color didn't turn healthy; removing it. ${live:+The $live color is still live.}" >&2
    bg_compose "$new" logs --tail 50 >&2 || true
    bg_remove "$new"
    exit 1
  fi
fi

if [ "${SAF_DEPLOY_LOCAL:-}" != 1 ] && [ -z "$main_up_first" ]; then
  up_main
fi

register_sites "$new"

if [ -n "$new" ]; then
  echo "Watching the $new color for ${SAF_WATCH_SECONDS:-60}s…"
  waited=0
  while [ "$waited" -lt "${SAF_WATCH_SECONDS:-60}" ]; do
    if ! bg_healthy "$new"; then
      if [ -n "$live" ]; then
        echo "The $new color turned unhealthy; switching back to $live." >&2
        register_sites "$live"
        bg_remove "$new"
      else
        echo "The $new color turned unhealthy, and there's no previous color to switch back to." >&2
      fi
      exit 1
    fi
    sleep 5
    waited=$((waited + 5))
  done
  mkdir -p "$(state_dir)"
  echo "$new" > "$(state_dir)/live"
  if [ -n "$live" ] && [ "$live" != "$new" ]; then
    echo "Removing the $live color."
    bg_remove "$live"
  fi
  echo "The $new color is live."
fi

if [ "${SAF_DEPLOY_LOCAL:-}" != 1 ]; then
  docker_cmd system prune -f
fi
