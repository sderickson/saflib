# syntax=docker/dockerfile:labs
FROM node:alpine3.19

WORKDIR /app

COPY --parents ./package.json ./package-lock.json ./drizzle/package.json ./env/package.json ./express/package.json ./monorepo/package.json ./node/package.json ./openapi/package.json ./secrets/secrets-db/package.json ./secrets/secrets-http/package.json ./secrets/secrets-service/package.json ./secrets/secrets-service-common/package.json ./secrets/secrets-spec/package.json ./utils/package.json ./
RUN npm install --omit=dev
COPY --parents ./drizzle ./env ./express ./monorepo ./node ./openapi ./secrets/secrets-db ./secrets/secrets-http ./secrets/secrets-service ./secrets/secrets-service-common ./secrets/secrets-spec ./utils ./

WORKDIR /app/services/secrets/secrets-service
CMD ["npm", "start"]
