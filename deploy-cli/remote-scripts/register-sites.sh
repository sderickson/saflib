# Register this deploy's edge routes (remote-assets/caddy/*.Caddyfile) with the
# edge Caddy run by the platform deploy, then reload it. The edge imports
# /etc/caddy/sites/*.Caddyfile from a volume, so routes survive edge restarts.
# If the reload fails, this deploy's previous routes are restored, so a bad
# route never takes the edge down.
#
# A `caddy/<name>.env` beside `<name>.Caddyfile` fills in that file's `{$KEY}`
# placeholders before it's copied (`<name>.prod-local.env` with --local), so a
# product's routes carry its own domain and CSP; keys it doesn't set are left
# for the edge's own env. Values are literal (no quoting or `$$` escapes,
# except that one pair of surrounding double quotes is dropped).
cd "$REMOTE_ASSETS_FOLDER_PATH"
render_route() {
  awk '
    NR == FNR {
      if ($0 ~ /^[A-Za-z_][A-Za-z0-9_]*=/) {
        eq = index($0, "=")
        value = substr($0, eq + 1)
        if (value ~ /^".*"$/) value = substr(value, 2, length(value) - 2)
        values["{$" substr($0, 1, eq - 1) "}"] = value
      }
      next
    }
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
  fi
}
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
    envf=$(route_env "$f")
    if [ -n "$envf" ]; then
      rendered=$(mktemp)
      render_route "$f" "$envf" > "$rendered"
      docker_cmd cp "$rendered" "$SAF_EDGE_CONTAINER:/etc/caddy/sites/$name"
      rm -f "$rendered"
    else
      docker_cmd cp "$f" "$SAF_EDGE_CONTAINER:/etc/caddy/sites/$name"
    fi
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
