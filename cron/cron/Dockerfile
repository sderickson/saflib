# syntax=docker/dockerfile:labs
FROM node:alpine3.19

WORKDIR /app

COPY --parents ./package.json ./package-lock.json ./cron/cron/package.json ./cron/cron-db/package.json ./cron/cron-spec/package.json ./drizzle/package.json ./env/package.json ./monorepo/package.json ./node/package.json ./openapi/package.json ./
RUN npm install --omit=dev
COPY --parents ./cron/cron ./cron/cron-db ./cron/cron-spec ./drizzle ./env ./monorepo ./node ./openapi ./

WORKDIR /app/services/cron
CMD ["npm", "start"]