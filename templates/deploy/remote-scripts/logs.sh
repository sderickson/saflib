#!/bin/bash

cd $REMOTE_ASSETS_FOLDER_PATH
docker compose -f docker-compose.prod.yaml logs -f --tail 100