# Edge routes and blue-green colors: functions shared by register-sites.sh and
# up.sh (each is prefixed with this file).
#
# Routes: a deploy's remote-assets/caddy/*.Caddyfile are copied into the edge
# Caddy run by the platform deploy (SAF_EDGE_CONTAINER), then the edge reloads.
# The edge imports /etc/caddy/sites/*.Caddyfile from a volume, so routes survive
# edge restarts. If the reload fails, this deploy's previous routes are
# restored, so a bad route never takes the edge down.
#
# A `caddy/<name>.env` beside `<name>.Caddyfile` fills in that file's `{$KEY}`
# placeholders before it's copied (`<name>.prod-local.env` with --local), so a
# product's routes carry its own domain and CSP; keys it doesn't set are left
# for the edge's own env. Values are literal (no quoting or `$$` escapes,
# except that one pair of surrounding double quotes is dropped). `{$SAF_COLOR}`
# is the deploy's live blue-green color.
#
# Blue-green: the services in remote-assets/docker-compose.blue-green.yaml run
# as two compose projects, <deploy>-blue and <deploy>-green. Each service's
# container is named `<service>-${SAF_COLOR}` and routes reach it by that name.

render_route() {
  awk -v color="$3" -v envfile="$2" '
    FILENAME == envfile {
      if ($0 ~ /^[A-Za-z_][A-Za-z0-9_]*=/) {
        eq = index($0, "=")
        value = substr($0, eq + 1)
        if (value ~ /^".*"$/) value = substr(value, 2, length(value) - 2)
        values["{$" substr($0, 1, eq - 1) "}"] = value
      }
      next
    }
    FNR == 1 && color != "" { values["{$SAF_COLOR}"] = color }
    {
      line = $0
      for (key in values) {
        out = ""
        while ((i = index(line, key)) > 0) {
          out = out substr(line, 1, i - 1) values[key]
          line = substr(line, i + length(key))
        }
        line = out line
      }
      print line
    }
  ' "$2" "$1"
}

route_env() {
  base="${1%.Caddyfile}"
  if [ "${SAF_DEPLOY_LOCAL:-}" = 1 ] && [ -f "$base.prod-local.env" ]; then
    echo "$base.prod-local.env"
  elif [ -f "$base.env" ]; then
    echo "$base.env"
  else
    echo /dev/null
  fi
}

# edge_caddy <args...>: run caddy in the edge through the container's
# entrypoint. `docker exec` skips the entrypoint, and an image may set the env
# its Caddyfile reads there (e.g. defaults applied by a wrapper script);
# `caddy reload` reads the Caddyfile in the exec'd process, so without that env
# every {$KEY} the entrypoint would have set comes out empty.
edge_caddy() {
  entrypoint=$(docker_cmd inspect -f '{{range .Config.Entrypoint}}{{.}} {{end}}' "$SAF_EDGE_CONTAINER")
  entrypoint="${entrypoint% }"
  case "$entrypoint" in
    "") docker_cmd exec "$SAF_EDGE_CONTAINER" caddy "$@" ;;
    caddy | */caddy | *" caddy" | *" "*/caddy)
      # shellcheck disable=SC2086 # the entrypoint's words, as Docker runs them
      docker_cmd exec "$SAF_EDGE_CONTAINER" $entrypoint "$@" ;;
    *)
      # shellcheck disable=SC2086
      docker_cmd exec "$SAF_EDGE_CONTAINER" $entrypoint caddy "$@" ;;
  esac
}

# register_sites [color]: copy this deploy's routes into the edge and reload.
register_sites() {
  color="${1:-}"
  ls caddy/*.Caddyfile > /dev/null 2>&1 || return 0
  if [ -z "${SAF_EDGE_CONTAINER:-}" ]; then
    echo "caddy/ has edge routes but SAF_EDGE_CONTAINER isn't set in env.remote." >&2
    return 1
  fi
  if ! docker_cmd inspect "$SAF_EDGE_CONTAINER" > /dev/null 2>&1; then
    echo "Edge container $SAF_EDGE_CONTAINER isn't running. Deploy the platform first." >&2
    return 1
  fi
  for f in caddy/*.Caddyfile; do
    name=$(basename "$f")
    docker_cmd exec "$SAF_EDGE_CONTAINER" sh -c "rm -f /etc/caddy/sites/$name.bak; [ ! -f /etc/caddy/sites/$name ] || cp /etc/caddy/sites/$name /etc/caddy/sites/$name.bak"
    rendered=$(mktemp)
    render_route "$f" "$(route_env "$f")" "$color" > "$rendered"
    docker_cmd cp "$rendered" "$SAF_EDGE_CONTAINER:/etc/caddy/sites/$name"
    rm -f "$rendered"
  done
  if edge_caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile; then
    for f in caddy/*.Caddyfile; do
      docker_cmd exec "$SAF_EDGE_CONTAINER" rm -f "/etc/caddy/sites/$(basename "$f").bak"
    done
    echo "Registered edge routes: $(cd caddy && ls *.Caddyfile | tr '\n' ' ')${color:+(color $color)}"
  else
    echo "Edge rejected the new routes; restoring the previous ones." >&2
    for f in caddy/*.Caddyfile; do
      name=$(basename "$f")
      docker_cmd exec "$SAF_EDGE_CONTAINER" sh -c "if [ -f /etc/caddy/sites/$name.bak ]; then mv /etc/caddy/sites/$name.bak /etc/caddy/sites/$name; else rm -f /etc/caddy/sites/$name; fi"
    done
    return 1
  fi
}

deploy_name() { echo "${SAF_DEPLOY_NAME:-$(basename "$REMOTE_ASSETS_FOLDER_PATH")}"; }

# Remembers the live color across deploys. Outside REMOTE_ASSETS_FOLDER_PATH,
# which `sync` replaces.
state_dir() {
  echo "${SAF_DEPLOY_STATE_DIR:-$(dirname "$REMOTE_ASSETS_FOLDER_PATH")/.saf-deploy/$(deploy_name)}"
}

bg_file() { echo "${SAF_BLUE_GREEN_COMPOSE:-docker-compose.blue-green.yaml}"; }

bg_enabled() { [ -f "$(bg_file)" ]; }

other_color() { if [ "$1" = blue ]; then echo green; else echo blue; fi; }

bg_compose() {
  files=(-f "$(bg_file)")
  # A rollback pins each service to the image it ran before (see bg_record).
  [ -z "${SAF_BG_OVERRIDE:-}" ] || files+=(-f "$SAF_BG_OVERRIDE")
  SAF_COLOR="$1" docker_cmd compose -p "$(deploy_name)-$1" "${files[@]}" "${@:2}"
}

bg_services() { bg_compose blue config --services; }

# The live color: the recorded one if its containers are running, else
# whichever color's are (e.g. a prod-local stack, which runs blue), else none.
live_color() {
  bg_enabled || return 0
  first=$(bg_services | head -n 1)
  running() { [ -n "$(docker_cmd ps -q --filter "name=^$first-$1\$")" ]; }
  if [ -f "$(state_dir)/live" ] && running "$(cat "$(state_dir)/live")"; then
    cat "$(state_dir)/live"
    return
  fi
  for color in blue green; do
    if running "$color"; then
      echo "$color"
      return
    fi
  done
}

# Whether every blue-green container of `color` is running and, if it has a
# health check, healthy.
bg_healthy() {
  for service in $(bg_services); do
    status=$(docker_cmd inspect -f '{{.State.Status}} {{if .State.Health}}{{.State.Health.Status}}{{end}}' "$service-$1" 2>/dev/null) || status=missing
    case "$status" in
      "running healthy" | "running ") ;;
      *) echo "$service-$1: $status" >&2; return 1 ;;
    esac
  done
}

# Waits up to $2 seconds for bg_healthy. Checked here rather than with
# `compose up --wait`, which some compose versions end successfully on timeout.
bg_wait_healthy() {
  deadline=$(( $(date +%s) + $2 ))
  until bg_healthy "$1" 2>/dev/null; do
    if [ "$(date +%s)" -ge "$deadline" ]; then
      echo "Not healthy after $2s:" >&2
      bg_healthy "$1"
      return 1
    fi
    sleep 1
  done
}

# Removes a color's containers, whichever compose project started them. They
# get SIGTERM first and up to 30s (SAF_STOP_TIMEOUT) to finish in-flight work.
bg_remove() {
  for service in $(bg_services); do
    docker_cmd stop -t "${SAF_STOP_TIMEOUT:-30}" "$service-$1" > /dev/null 2>&1 || true
  done
  bg_compose "$1" down --remove-orphans > /dev/null 2>&1 || true
  for service in $(bg_services); do
    docker_cmd rm -f "$service-$1" > /dev/null 2>&1 || true
  done
}

# Records the images a color runs as a compose override, so `saf-deploy
# rollback` can run them again: the registry digest when there is one (it
# still pulls after :latest moves on), else the local image ID.
bg_record() {
  out="$(state_dir)/previous.yaml"
  mkdir -p "$(state_dir)"
  {
    echo "# Images the $1 color ran, written by saf-deploy up for saf-deploy rollback."
    echo "services:"
    for service in $(bg_services); do
      id=$(docker_cmd inspect -f '{{.Image}}' "$service-$1" 2>/dev/null) || continue
      ref=$(docker_cmd image inspect -f '{{if .RepoDigests}}{{index .RepoDigests 0}}{{end}}' "$id" 2>/dev/null || true)
      echo "  $service:"
      echo "    image: ${ref:-$id}"
    done
  } > "$out.tmp"
  mv "$out.tmp" "$out"
}
