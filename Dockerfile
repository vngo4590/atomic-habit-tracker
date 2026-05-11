# syntax=docker/dockerfile:1

FROM node:24-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN mkdir -p lib
RUN npm ci

FROM deps AS builder
ARG NEXT_PUBLIC_APP_URL=http://localhost:30080
ARG DEPLOYMENT_VERSION=local
ENV NODE_ENV=production
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV DEPLOYMENT_VERSION=$DEPLOYMENT_VERSION
ENV DATABASE_URL=postgresql://postgres:postgres@postgres:5432/atomicly?schema=public
COPY . .
RUN npm run build

FROM deps AS migrator
ENV NODE_ENV=production
COPY . .
RUN npm run prisma:generate
CMD ["npm", "run", "prisma:migrate:deploy"]

FROM base AS runner
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
