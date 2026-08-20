
echo "Pulling latest docker images..."
docker pull $CONTAINER_REGISTRY/saflib-caddy:latest
docker pull $CONTAINER_REGISTRY/saflib-kratos:v26.2.0
# BEGIN WORKFLOW AREA pull-images FOR product/init
docker pull $CONTAINER_REGISTRY/saflib-templates-monolith:latest
# END WORKFLOW AREA
echo "Done!"
