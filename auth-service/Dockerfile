FROM node:22-slim

WORKDIR /app

# Copy package.json
COPY package*.json ./
COPY tsconfig.json ./
COPY saflib/ ./saflib/

COPY services/auth/package*.json ./services/auth/
COPY specs/apis/package*.json ./specs/apis/

RUN npm install --omit=dev

# Copy source files
COPY services/auth ./services/auth
COPY specs/apis/dist ./specs/apis/dist

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 CMD ["npm", "run", "healthcheck"]
WORKDIR /app/services/auth
CMD ["npm", "start"]