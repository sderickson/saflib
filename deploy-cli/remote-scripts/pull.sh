# Pull this product's images (those from $CONTAINER_REGISTRY in the prod
# compose file and, if there is one, the blue-green one). Third-party images
# are left to `docker compose up`.
cd "$REMOTE_ASSETS_FOLDER_PATH"
files="-f docker-compose.prod.yaml"
[ ! -f docker-compose.blue-green.yaml ] || files="$files -f docker-compose.blue-green.yaml"
images=$(docker_cmd compose $files config --images | grep "^$CONTAINER_REGISTRY/" | sort -u || true)
if [ -z "$images" ]; then
  echo "No $CONTAINER_REGISTRY images in the compose files"
  exit 0
fi
for image in $images; do
  echo "Pulling $image"
  docker_cmd pull "$image"
done
echo "Done!"
