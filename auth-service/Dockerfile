# syntax=docker/dockerfile:labs
FROM node:alpine

# install saflib
WORKDIR /app
COPY tsconfig.json ./

COPY --parents ./package.json ./package-lock.json ./saflib/auth-db/package.json ./saflib/auth-service/package.json ./saflib/auth-spec/package.json ./saflib/drizzle-sqlite3/package.json ./saflib/email/package.json ./saflib/node-express/package.json ./saflib/node-logger/package.json ./saflib/openapi-specs/package.json ./
RUN npm install --omit=dev

COPY --parents ./saflib/auth-db ./saflib/auth-service ./saflib/auth-spec ./saflib/drizzle-sqlite3 ./saflib/email ./saflib/node-express ./saflib/node-logger ./saflib/openapi-specs ./

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 CMD ["npm", "run", "healthcheck"]
WORKDIR /app/saflib/auth-service
CMD ["npm", "start"]