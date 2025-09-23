# syntax=docker/dockerfile:labs
FROM node:alpine3.19

WORKDIR /app

COPY --parents ./package.json ./package-lock.json ./drizzle/package.json ./env/package.json ./express/package.json ./monorepo/package.json ./node/package.json ./openapi/package.json ./utils/package.json ./drizzle/workflows/templates/package.json ./express/workflows/templates/package.json ./service/workflows/service-templates/package.json ./service/workflows/common-templates/package.json ./openapi/workflows/templates/package.json ./
RUN npm install --omit=dev
COPY --parents ./drizzle ./env ./express ./monorepo ./node ./openapi ./utils ./drizzle/workflows/templates ./express/workflows/templates ./service/workflows/service-templates ./service/workflows/common-templates ./openapi/workflows/templates ./

WORKDIR /app/__service-group-dir__/__service-name__-service
CMD ["npm", "start"]
