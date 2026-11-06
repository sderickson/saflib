# Brings the deploy up (prefixed with sites.sh). With a
# docker-compose.blue-green.yaml, its services deploy blue-green: the idle
# color starts, and as soon as it's healthy (waiting up to SAF_HEALTH_TIMEOUT,
# default 60s) routes switch to it and the old color is removed.
cd "$REMOTE_ASSETS_FOLDER_PATH"

up_main() {
  # When everything deploys blue-green, only clear out containers the main
  # project used to run (e.g. before the services moved to blue-green).
  if [ -z "$(docker_cmd compose -f docker-compose.prod.yaml config --services)" ]; then
    docker_cmd compose -f docker-compose.prod.yaml down --remove-orphans
    return 0
  fi
  # Force recreate so bind mounts (e.g. ./kratos) reattach after sync replaces
  # directory trees. Without this, long-lived containers keep stale mount inodes
  # and fail with missing config files like identity.schema.json.
  docker_cmd compose -f docker-compose.prod.yaml up -d --force-recreate --remove-orphans
}

# A first deploy brings the main stack up before the colors: it may create
# what they need (e.g. the platform's edge network), and nothing is live yet.
main_up_first=""
if [ "${SAF_DEPLOY_LOCAL:-}" != 1 ] && [ -z "${SAF_SKIP_MAIN:-}" ] && [ -z "$(docker_cmd compose -f docker-compose.prod.yaml ps -q)" ]; then
  up_main
  main_up_first=1
fi

live=""
new=""
if bg_enabled; then
  live=$(live_color)
  new=$(other_color "${live:-green}")
  echo "Starting the $new color (live: ${live:-none})…"
  if ! bg_compose "$new" up -d --force-recreate || ! bg_wait_healthy "$new" "${SAF_HEALTH_TIMEOUT:-60}"; then
    echo "The $new color didn't turn healthy; removing it. ${live:+The $live color is still live.}" >&2
    bg_compose "$new" logs --tail 50 >&2 || true
    bg_remove "$new"
    exit 1
  fi
fi

if [ "${SAF_DEPLOY_LOCAL:-}" != 1 ] && [ -z "${SAF_SKIP_MAIN:-}" ] && [ -z "$main_up_first" ]; then
  up_main
fi

register_sites "$new"

if [ -n "$new" ]; then
  mkdir -p "$(state_dir)"
  echo "$new" > "$(state_dir)/live"
  if [ -n "$live" ] && [ "$live" != "$new" ]; then
    bg_record "$live"
    echo "Removing the $live color (its images are recorded for saf-deploy rollback)."
    bg_remove "$live"
  fi
  echo "The $new color is live."
fi

if [ "${SAF_DEPLOY_LOCAL:-}" != 1 ]; then
  docker_cmd system prune -f
fi
