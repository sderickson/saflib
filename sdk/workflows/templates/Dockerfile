# syntax=docker/dockerfile:labs
FROM node:22-slim AS builder

# Copy package.json
WORKDIR /app

COPY --parents ./package.json ./package-lock.json ./env/package.json ./links/package.json ./monorepo/package.json ./openapi/package.json ./sdk/package.json ./__service-name__/__service-name__-sdk/package.json ./__service-name__/__service-name__-spec/package.json ./utils/package.json ./vite/package.json ./vue/package.json ./
RUN npm install
RUN npm install @rollup/rollup-linux-arm64-gnu

COPY --parents ./env ./links ./monorepo ./openapi ./sdk ./__service-name__/__service-name__-sdk ./__service-name__/__service-name__-spec ./utils ./vite ./vue ./

# Vue app setup
WORKDIR /app/__service-name__/__service-name__-sdk
