#!/bin/bash

cd ${REMOTE_ASSETS_FOLDER_PATH}
CONTAINER_REGISTRY=$CONTAINER_REGISTRY docker compose --env-file .env.prod -f docker-compose.prod.yaml down