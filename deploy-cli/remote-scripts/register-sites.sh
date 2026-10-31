# Register this deploy's edge routes (remote-assets/caddy/*.Caddyfile) with the
# edge Caddy run by the platform deploy, then reload it. The edge imports
# /etc/caddy/sites/*.Caddyfile from a volume, so routes survive edge restarts.
# If the reload fails, this deploy's previous routes are restored, so a bad
# route never takes the edge down.
cd "$REMOTE_ASSETS_FOLDER_PATH"
if ls caddy/*.Caddyfile > /dev/null 2>&1; then
  if [ -z "${SAF_EDGE_CONTAINER:-}" ]; then
    echo "caddy/ has edge routes but SAF_EDGE_CONTAINER isn't set in env.remote." >&2
    exit 1
  fi
  if ! docker_cmd inspect "$SAF_EDGE_CONTAINER" > /dev/null 2>&1; then
    echo "Edge container $SAF_EDGE_CONTAINER isn't running. Deploy the platform first." >&2
    exit 1
  fi
  for f in caddy/*.Caddyfile; do
    name=$(basename "$f")
    docker_cmd exec "$SAF_EDGE_CONTAINER" sh -c "rm -f /etc/caddy/sites/$name.bak; [ ! -f /etc/caddy/sites/$name ] || cp /etc/caddy/sites/$name /etc/caddy/sites/$name.bak"
    docker_cmd cp "$f" "$SAF_EDGE_CONTAINER:/etc/caddy/sites/$name"
  done
  if docker_cmd exec "$SAF_EDGE_CONTAINER" caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile; then
    for f in caddy/*.Caddyfile; do
      docker_cmd exec "$SAF_EDGE_CONTAINER" rm -f "/etc/caddy/sites/$(basename "$f").bak"
    done
    echo "Registered edge routes: $(cd caddy && ls *.Caddyfile | tr '\n' ' ')"
  else
    echo "Edge rejected the new routes; restoring the previous ones." >&2
    for f in caddy/*.Caddyfile; do
      name=$(basename "$f")
      docker_cmd exec "$SAF_EDGE_CONTAINER" sh -c "if [ -f /etc/caddy/sites/$name.bak ]; then mv /etc/caddy/sites/$name.bak /etc/caddy/sites/$name; else rm -f /etc/caddy/sites/$name; fi"
    done
    exit 1
  fi
fi
