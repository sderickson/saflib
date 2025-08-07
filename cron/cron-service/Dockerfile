# syntax=docker/dockerfile:labs
FROM node:alpine3.19

WORKDIR /app

COPY --parents ./package.json ./package-lock.json ./saflib/cron/cron-db/package.json ./saflib/cron/cron-service/package.json ./saflib/cron/cron-spec/package.json ./saflib/drizzle-sqlite3/package.json ./saflib/env/package.json ./saflib/monorepo/package.json ./saflib/node/package.json ./saflib/openapi-specs/package.json ./
RUN npm install --omit=dev
COPY --parents ./saflib/cron/cron-db ./saflib/cron/cron-service ./saflib/cron/cron-spec ./saflib/drizzle-sqlite3 ./saflib/env ./saflib/monorepo ./saflib/node ./saflib/openapi-specs ./

WORKDIR /app/services/cron
CMD ["npm", "start"]