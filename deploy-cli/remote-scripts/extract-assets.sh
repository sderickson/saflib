# Unpack $REMOTE_ZIP_PATH/$ZIP_NAME into $REMOTE_ASSETS_FOLDER_PATH.
cd "$REMOTE_ZIP_PATH"
for tool in unzip rsync; do
  if ! command -v "$tool" &> /dev/null; then
    echo "$tool not found, installing..."
    $SUDO apt-get update
    $SUDO apt-get install -y "$tool"
  fi
done
# rsync keeps existing directory inodes (critical for Docker bind mounts like
# ./kratos). rm -rf + unzip recreates dirs and leaves running containers
# mounted to deleted empty inodes.
mkdir -p "$REMOTE_ASSETS_FOLDER_PATH"
EXTRACT_TMP=$(mktemp -d)
unzip -oq "$ZIP_NAME" -d "$EXTRACT_TMP"
rsync -a --delete "$EXTRACT_TMP"/ "$REMOTE_ASSETS_FOLDER_PATH"
rm -rf "$EXTRACT_TMP" "$ZIP_NAME"
echo "Done!"
