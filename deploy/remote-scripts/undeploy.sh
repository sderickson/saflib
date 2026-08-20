#!/bin/bash

cd ${REMOTE_ASSETS_FOLDER_PATH}
CONTAINER_REGISTRY=$CONTAINER_REGISTRY docker compose -f docker-compose.prod.yaml down