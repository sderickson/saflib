#!/bin/bash

cd $REMOTE_ASSETS_FOLDER_PATH
docker compose -f docker-compose.prod.yaml up
docker system prune -f