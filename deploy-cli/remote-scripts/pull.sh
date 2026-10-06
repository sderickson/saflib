# Pull this product's images (those from $CONTAINER_REGISTRY in the prod
# compose file). Third-party images are left to `docker compose up`.
cd "$REMOTE_ASSETS_FOLDER_PATH"
images=$(docker compose -f docker-compose.prod.yaml config --images | grep "^$CONTAINER_REGISTRY/" || true)
if [ -z "$images" ]; then
  echo "No $CONTAINER_REGISTRY images in docker-compose.prod.yaml"
  exit 0
fi
for image in $images; do
  echo "Pulling $image"
  docker pull "$image"
done
echo "Done!"
