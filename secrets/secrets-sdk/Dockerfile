# syntax=docker/dockerfile:labs
FROM node:22-slim AS builder

# Copy package.json
WORKDIR /app

COPY --parents ./package.json ./package-lock.json ./env/package.json ./links/package.json ./monorepo/package.json ./openapi/package.json ./sdk/package.json ./secrets/secrets-sdk/package.json ./secrets/secrets-spec/package.json ./utils/package.json ./vite/package.json ./vue/package.json ./
RUN npm install
RUN npm install @rollup/rollup-linux-arm64-gnu

COPY --parents ./env ./links ./monorepo ./openapi ./sdk ./secrets/secrets-sdk ./secrets/secrets-spec ./utils ./vite ./vue ./

# Vue app setup
WORKDIR /app/secrets/secrets-sdk