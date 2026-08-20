
echo "Pulling latest docker images..."
docker pull $CONTAINER_REGISTRY/__organization-name__-caddy:latest
docker pull $CONTAINER_REGISTRY/__organization-name__-kratos:v26.2.0
# BEGIN WORKFLOW AREA pull-images FOR product/init
docker pull $CONTAINER_REGISTRY/__organization-name__-__product-name__-monolith:latest
# END WORKFLOW AREA
echo "Done!"
