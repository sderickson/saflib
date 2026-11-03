# Rolls the blue-green services back to the images the previous color ran
# (recorded by `up`), through the same health-gated switch as a deploy. The
# rest of the stack is left alone. Followed by up.sh.
cd "$REMOTE_ASSETS_FOLDER_PATH"
if [ ! -f "$(state_dir)/previous.yaml" ]; then
  echo "No previous release recorded for $(deploy_name); nothing to roll back to." >&2
  exit 1
fi
SAF_BG_OVERRIDE=$(mktemp)
cp "$(state_dir)/previous.yaml" "$SAF_BG_OVERRIDE"
export SAF_BG_OVERRIDE SAF_SKIP_MAIN=1
echo "Rolling back to:"
grep "image:" "$SAF_BG_OVERRIDE"
