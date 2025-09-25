# syntax=docker/dockerfile:labs
FROM node:alpine3.19

WORKDIR /app

COPY --parents ./package.json ./package-lock.json ./saflib/drizzle/package.json ./saflib/env/package.json ./saflib/express/package.json ./saflib/monorepo/package.json ./saflib/node/package.json ./saflib/openapi/package.json ./saflib/utils/package.json ./saflib/drizzle/workflows/templates/package.json ./saflib/express/workflows/templates/package.json ./saflib/service/workflows/service-templates/package.json ./saflib/service/workflows/common-templates/package.json ./saflib/openapi/workflows/templates/package.json ./
RUN npm install --omit=dev
COPY --parents ./saflib/drizzle ./saflib/env ./saflib/express ./saflib/monorepo ./saflib/node ./saflib/openapi ./saflib/utils ./saflib/drizzle/workflows/templates ./saflib/express/workflows/templates ./saflib/service/workflows/service-templates ./saflib/service/workflows/common-templates ./saflib/openapi/workflows/templates ./

WORKDIR /app/__service-group-dir__/__service-name__-service
CMD ["npm", "start"]
