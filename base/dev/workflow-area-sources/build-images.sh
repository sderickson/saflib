# Source for CopyStep upsert into {product}/dev/build-images.sh.
# Live build-images.sh keeps this area empty so base/dev skips the expansion stub.
# BEGIN WORKFLOW AREA build-static-sites FOR vue/add-static-site
docker_build ./base/clients/__static-subdomain-name__/Dockerfile \
  -t saflib-base-__static-subdomain-name__-static:latest &
pids+=($!)
# END WORKFLOW AREA
