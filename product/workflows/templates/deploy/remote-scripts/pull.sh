sudo -i
echo "Pulling latest docker images..."
docker pull $CONTAINER_REGISTRY/__org-name__-caddy:latest
docker pull $CONTAINER_REGISTRY/__org-name__-__product-name__-monolith:latest
echo "Done!"