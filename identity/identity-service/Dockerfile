# syntax=docker/dockerfile:labs
FROM node:alpine3.19

# install saflib
WORKDIR /app
COPY tsconfig.json ./

COPY --parents ./package.json ./package-lock.json ./saflib/drizzle-sqlite3/package.json ./saflib/email-node/package.json ./saflib/email-spec/package.json ./saflib/env/package.json ./saflib/express/package.json ./saflib/grpc-node/package.json ./saflib/grpc-specs/package.json ./saflib/identity/identity-db/package.json ./saflib/identity/identity-links/package.json ./saflib/identity/identity-rpcs/package.json ./saflib/identity/identity-service/package.json ./saflib/identity/identity-spec/package.json ./saflib/links/package.json ./saflib/monorepo/package.json ./saflib/node/package.json ./saflib/openapi-specs/package.json ./
RUN npm install --omit=dev

COPY --parents ./saflib/drizzle-sqlite3 ./saflib/email-node ./saflib/email-spec ./saflib/env ./saflib/express ./saflib/grpc-node ./saflib/grpc-specs ./saflib/identity/identity-db ./saflib/identity/identity-links ./saflib/identity/identity-rpcs ./saflib/identity/identity-service ./saflib/identity/identity-spec ./saflib/links ./saflib/monorepo ./saflib/node ./saflib/openapi-specs ./

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 CMD ["npm", "run", "healthcheck"]
WORKDIR /app/saflib/auth-service
CMD ["npm", "start"]