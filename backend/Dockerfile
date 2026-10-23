# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim

ENV NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_FUND=false

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json tsconfig.base.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json

RUN npm ci --include=dev

COPY backend backend

RUN npm run db:generate -w backend \
    && npm run build -w backend \
    && chown -R node:node /app

ENV NODE_ENV=production

USER node

EXPOSE 3000

CMD ["sh", "-c", "npm run db:migrate:deploy -w backend && npm run db:seed -w backend && npm run start -w backend"]
