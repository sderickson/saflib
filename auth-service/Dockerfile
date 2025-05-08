# syntax=docker/dockerfile:labs
FROM node:alpine

# hopefully a temporary fix for better-sqlite3
# remove when prebuilt binaries are available
RUN apk add --no-cache python3
RUN apk add --no-cache make
RUN apk add --no-cache g++

# install saflib
WORKDIR /app
COPY tsconfig.json ./

COPY --parents ./package.json ./package-lock.json ./saflib/auth-db/package.json ./saflib/auth-service/package.json ./saflib/auth-spec/package.json ./saflib/drizzle-sqlite3/package.json ./saflib/email/package.json ./saflib/express/package.json ./saflib/node/package.json ./saflib/openapi-specs/package.json ./
RUN npm install better-sqlite3 # Just to separate the binary build step - remove when prebuilt binaries are available
RUN npm install --omit=dev

COPY --parents ./saflib/auth-db ./saflib/auth-service ./saflib/auth-spec ./saflib/drizzle-sqlite3 ./saflib/email ./saflib/express ./saflib/node ./saflib/openapi-specs ./

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 CMD ["npm", "run", "healthcheck"]
WORKDIR /app/saflib/auth-service
CMD ["npm", "start"]