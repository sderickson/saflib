# syntax=docker/dockerfile:labs
FROM node:alpine3.19

# install saflib
WORKDIR /app
COPY tsconfig.json ./

COPY --parents ./package.json ./package-lock.json ./saflib/auth-db/package.json ./saflib/auth-links/package.json ./saflib/auth-rpcs/package.json ./saflib/auth-service/package.json ./saflib/auth-spec/package.json ./saflib/drizzle-sqlite3/package.json ./saflib/email-node/package.json ./saflib/email-spec/package.json ./saflib/express/package.json ./saflib/grpc-node/package.json ./saflib/grpc-specs/package.json ./saflib/links/package.json ./saflib/monorepo/package.json ./saflib/node/package.json ./saflib/openapi-specs/package.json ./
RUN npm install --omit=dev

COPY --parents ./saflib/auth-db ./saflib/auth-links ./saflib/auth-rpcs ./saflib/auth-service ./saflib/auth-spec ./saflib/drizzle-sqlite3 ./saflib/email-node ./saflib/email-spec ./saflib/express ./saflib/grpc-node ./saflib/grpc-specs ./saflib/links ./saflib/monorepo ./saflib/node ./saflib/openapi-specs ./

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 CMD ["npm", "run", "healthcheck"]
WORKDIR /app/saflib/auth-service
CMD ["npm", "start"]