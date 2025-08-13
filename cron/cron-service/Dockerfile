# syntax=docker/dockerfile:labs
FROM node:alpine3.19

WORKDIR /app

COPY --parents ./package.json ./package-lock.json ./saflib/cron/cron-db/package.json ./saflib/cron/cron-service/package.json ./saflib/cron/cron-spec/package.json ./saflib/drizzle-sqlite3/package.json ./saflib/env/package.json ./saflib/monorepo/package.json ./saflib/node/package.json ./saflib/openapi/package.json ./saflib/node_modules/better-sqlite3/package.json ./saflib/node_modules/drizzle-kit/package.json ./saflib/node_modules/drizzle-orm/package.json ./saflib/node_modules/esbuild/package.json ./
RUN npm install --omit=dev
COPY --parents ./saflib/cron/cron-db ./saflib/cron/cron-service ./saflib/cron/cron-spec ./saflib/drizzle-sqlite3 ./saflib/env ./saflib/monorepo ./saflib/node ./saflib/openapi ./saflib/node_modules/better-sqlite3 ./saflib/node_modules/drizzle-kit ./saflib/node_modules/drizzle-orm ./saflib/node_modules/esbuild ./

WORKDIR /app/services/cron
CMD ["npm", "start"]