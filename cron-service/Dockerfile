# syntax=docker/dockerfile:labs
FROM node:alpine3.19

WORKDIR /app

COPY --parents ./package.json ./package-lock.json ./saflib/cron-db/package.json ./saflib/cron-service/package.json ./saflib/cron-spec/package.json ./saflib/drizzle-sqlite3/package.json ./saflib/env/package.json ./saflib/express/package.json ./saflib/grpc-node/package.json ./saflib/grpc-specs/package.json ./saflib/monorepo/package.json ./saflib/node/package.json ./saflib/openapi-specs/package.json ./
RUN npm install --omit=dev
COPY --parents ./saflib/cron-db ./saflib/cron-service ./saflib/cron-spec ./saflib/drizzle-sqlite3 ./saflib/env ./saflib/express ./saflib/grpc-node ./saflib/grpc-specs ./saflib/monorepo ./saflib/node ./saflib/openapi-specs ./

WORKDIR /app/services/cron
CMD ["npm", "start"]