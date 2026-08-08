
echo "Pulling latest docker images..."
docker pull $CONTAINER_REGISTRY/saflib-caddy:latest
# BEGIN WORKFLOW AREA pull-images FOR product/init
docker pull $CONTAINER_REGISTRY/saflib-tmp-monolith:latest
# END WORKFLOW AREA
echo "Done!"