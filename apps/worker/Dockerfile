# Riaya background worker (pg-boss). Built from the monorepo root context.
FROM node:22-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc* ./
COPY apps/web/package.json apps/web/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY packages/ packages/
RUN pnpm install --frozen-lockfile

COPY . .

ENV NODE_ENV=production
CMD ["pnpm", "--filter", "@riaya/worker", "start"]
