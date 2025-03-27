FROM node:22-slim

# install saflib
WORKDIR /app
COPY package*.json ./
COPY tsconfig.json ./
COPY saflib/ ./saflib/
RUN npm install --omit=dev

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 CMD ["npm", "run", "healthcheck"]
WORKDIR /app/saflib/auth-service
CMD ["npm", "start"]