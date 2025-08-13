# syntax=docker/dockerfile:labs
FROM node:alpine3.19

# install saflib
WORKDIR /app
COPY tsconfig.json ./

COPY --parents ./package.json ./package-lock.json ./saflib/drizzle-sqlite3/package.json ./saflib/email/email-node/package.json ./saflib/email/email-spec/package.json ./saflib/env/package.json ./saflib/express/package.json ./saflib/grpc/grpc-node/package.json ./saflib/grpc/grpc-specs/package.json ./saflib/identity/identity-db/package.json ./saflib/identity/identity-links/package.json ./saflib/identity/identity-rpcs/package.json ./saflib/identity/identity-service/package.json ./saflib/identity/identity-spec/package.json ./saflib/links/package.json ./saflib/monorepo/package.json ./saflib/node/package.json ./saflib/openapi/package.json ./saflib/node_modules/better-sqlite3/package.json ./saflib/node_modules/drizzle-kit/package.json ./saflib/node_modules/drizzle-orm/package.json ./saflib/node_modules/esbuild/package.json ./
RUN npm install --omit=dev

COPY --parents ./saflib/drizzle-sqlite3 ./saflib/email/email-node ./saflib/email/email-spec ./saflib/env ./saflib/express ./saflib/grpc/grpc-node ./saflib/grpc/grpc-specs ./saflib/identity/identity-db ./saflib/identity/identity-links ./saflib/identity/identity-rpcs ./saflib/identity/identity-service ./saflib/identity/identity-spec ./saflib/links ./saflib/monorepo ./saflib/node ./saflib/openapi ./saflib/node_modules/better-sqlite3 ./saflib/node_modules/drizzle-kit ./saflib/node_modules/drizzle-orm ./saflib/node_modules/esbuild ./

WORKDIR /app/saflib/auth-service
CMD ["npm", "start"]