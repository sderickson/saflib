# Registers this deploy's routes (prefixed with sites.sh), naming the live
# blue-green color where routes use {$SAF_COLOR}.
cd "$REMOTE_ASSETS_FOLDER_PATH"
register_sites "$(live_color)"
