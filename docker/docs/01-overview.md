# Overview

`@saflib/docker` provides some utility logic for managing Dockerfiles and builds:

- Generates Dockerfiles from `Dockerfile.template` files so packages to copy don't need to be managed by hand.
- Writes git commit metadata to the file system where it can be accessed in the build by the browser and Node.
