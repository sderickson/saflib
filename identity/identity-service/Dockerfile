# syntax=docker/dockerfile:labs
FROM node:alpine3.19

# install saflib
WORKDIR /app
COPY tsconfig.json ./

COPY --parents ./package.json ./package-lock.json ./drizzle-sqlite3/package.json ./email/email-node/package.json ./email/email-spec/package.json ./env/package.json ./express/package.json ./grpc/grpc-node/package.json ./grpc/grpc-specs/package.json ./identity/identity-db/package.json ./identity/identity-links/package.json ./identity/identity-rpcs/package.json ./identity/identity-service/package.json ./identity/identity-spec/package.json ./links/package.json ./monorepo/package.json ./node/package.json ./openapi/package.json ./
RUN npm install --omit=dev

COPY --parents ./drizzle-sqlite3 ./email/email-node ./email/email-spec ./env ./express ./grpc/grpc-node ./grpc/grpc-specs ./identity/identity-db ./identity/identity-links ./identity/identity-rpcs ./identity/identity-service ./identity/identity-spec ./links ./monorepo ./node ./openapi ./

WORKDIR /app/saflib/auth-service
CMD ["npm", "start"]