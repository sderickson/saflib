
echo "Pulling latest docker images..."
docker pull $CONTAINER_REGISTRY/__organization-name__-caddy:latest
# BEGIN WORKFLOW AREA pull-images FOR product/init
docker pull $CONTAINER_REGISTRY/__organization-name__-__product-name__-monolith:latest
# END WORKFLOW AREA
echo "Done!"