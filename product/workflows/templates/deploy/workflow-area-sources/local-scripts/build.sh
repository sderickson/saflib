# Source for CopyStep upsert into deploy/local-scripts/build.sh.
# Live build.sh keeps this area empty; product/init area must be present for validate.
# BEGIN WORKFLOW AREA build-static-sites FOR vue/add-static-site
docker_build ./__product-name__/clients/__static-subdomain-name__/Dockerfile \
  -t __organization-name__-__product-name__-__static-subdomain-name__-static:latest \
  -t "$CONTAINER_REGISTRY/__organization-name__-__product-name__-__static-subdomain-name__-static:latest" &
pids+=($!)
# END WORKFLOW AREA

# BEGIN WORKFLOW AREA build-product-dependencies FOR product/init
# END WORKFLOW AREA
