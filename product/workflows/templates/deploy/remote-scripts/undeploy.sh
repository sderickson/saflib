#!/bin/bash
sudo -i
cd ${REMOTE_ASSETS_FOLDER_PATH}/remote-assets
docker compose --env-file .env.prod -f docker-compose.prod.yaml down