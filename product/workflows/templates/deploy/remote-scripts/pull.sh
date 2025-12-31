sudo -i
echo "Pulling latest docker images..."
docker pull $CONTAINER_REGISTRY/__organization-name__-caddy:latest
docker pull $CONTAINER_REGISTRY/__organization-name__-__product-name__-monolith:latest
echo "Done!"