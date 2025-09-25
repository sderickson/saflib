# syntax=docker/dockerfile:labs
FROM node:alpine3.19

WORKDIR /app

COPY --parents ./package.json ./package-lock.json ./saflib/drizzle/package.json ./saflib/env/package.json ./saflib/express/package.json ./saflib/monorepo/package.json ./saflib/node/package.json ./saflib/openapi/package.json ./saflib/secrets/secrets-db/package.json ./saflib/secrets/secrets-http/package.json ./saflib/secrets/secrets-service/package.json ./saflib/secrets/secrets-service-common/package.json ./saflib/secrets/secrets-spec/package.json ./saflib/utils/package.json ./
RUN npm install --omit=dev
COPY --parents ./saflib/drizzle ./saflib/env ./saflib/express ./saflib/monorepo ./saflib/node ./saflib/openapi ./saflib/secrets/secrets-db ./saflib/secrets/secrets-http ./saflib/secrets/secrets-service ./saflib/secrets/secrets-service-common ./saflib/secrets/secrets-spec ./saflib/utils ./

WORKDIR /app/services/secrets/secrets-service
CMD ["npm", "start"]
