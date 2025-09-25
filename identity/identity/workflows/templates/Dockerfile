# syntax=docker/dockerfile:labs
FROM node:alpine3.19

WORKDIR /app

COPY --parents ./package.json ./package-lock.json ./identity/auth-links/package.json ./drizzle/package.json ./email/email/package.json ./email/email-spec/package.json ./env/package.json ./express/package.json ./grpc/grpc/package.json ./grpc/grpc-specs/package.json ./identity/identity/package.json ./identity/identity-common/package.json ./identity/identity-db/package.json ./identity/identity-grpc/package.json ./identity/identity-http/package.json ./identity/identity-rpcs/package.json ./identity/identity-spec/package.json ./links/package.json ./monorepo/package.json ./node/package.json ./openapi/package.json ./utils/package.json ./identity/identity/workflows/templates/package.json ./
RUN npm install --omit=dev
COPY --parents ./identity/auth-links ./drizzle ./email/email ./email/email-spec ./env ./express ./grpc/grpc ./grpc/grpc-specs ./identity/identity ./identity/identity-common ./identity/identity-db ./identity/identity-grpc ./identity/identity-http ./identity/identity-rpcs ./identity/identity-spec ./links ./monorepo ./node ./openapi ./utils ./identity/identity/workflows/templates ./

WORKDIR /app/services/template-file-identity
CMD ["npm", "start"]
