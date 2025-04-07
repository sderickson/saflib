# syntax=docker/dockerfile:labs
FROM node:22-slim

# install saflib
WORKDIR /app
COPY tsconfig.json ./

COPY --parents ./package.json ./package-lock.json ./package.json ./clients/docs/package.json ./clients/spas/package.json ./dbs/main/package.json ./deploy/instance/package.json ./saflib/auth-db/package.json ./saflib/auth-service/package.json ./saflib/auth-spec/package.json ./saflib/auth-vue/package.json ./saflib/dev-tools/package.json ./saflib/drizzle-sqlite3/package.json ./saflib/drizzle-sqlite3-dev/package.json ./saflib/monorepo/package.json ./saflib/monorepo-dev/package.json ./saflib/node-express/package.json ./saflib/node-express-dev/package.json ./saflib/openapi-specs/package.json ./saflib/processes/package.json ./saflib/vitest/package.json ./saflib/vue-spa/package.json ./saflib/vue-spa-dev/package.json ./services/api/package.json ./specs/apis/package.json ./
RUN npm install --omit=dev

COPY --parents ./ ./clients/docs ./clients/spas ./dbs/main ./deploy/instance ./saflib/auth-db ./saflib/auth-service ./saflib/auth-spec ./saflib/auth-vue ./saflib/dev-tools ./saflib/drizzle-sqlite3 ./saflib/drizzle-sqlite3-dev ./saflib/monorepo ./saflib/monorepo-dev ./saflib/node-express ./saflib/node-express-dev ./saflib/openapi-specs ./saflib/processes ./saflib/vitest ./saflib/vue-spa ./saflib/vue-spa-dev ./services/api ./specs/apis ./

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 CMD ["npm", "run", "healthcheck"]
WORKDIR /app/saflib/auth-service
CMD ["npm", "start"]