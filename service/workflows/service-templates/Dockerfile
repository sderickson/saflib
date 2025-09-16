# syntax=docker/dockerfile:labs
FROM node:alpine3.19

WORKDIR /app

COPY --parents ./package.json ./package-lock.json ./saflib/env/package.json ./saflib/monorepo/package.json ./saflib/node/package.json ./saflib/service/workflows/service-templates/package.json ./saflib/service/workflows/common-templates/package.json ./
RUN npm install --omit=dev
COPY --parents ./saflib/env ./saflib/monorepo ./saflib/node ./saflib/service/workflows/service-templates ./saflib/service/workflows/common-templates ./

WORKDIR /app/services/template-file/template-file-service
CMD ["npm", "start"]
