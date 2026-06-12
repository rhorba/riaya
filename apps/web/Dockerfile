# Riaya web (Next.js 15). Built from the monorepo root context.
FROM node:22-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

# ── Install deps (whole workspace; packages export TS source, no build step) ──
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc* ./
COPY apps/web/package.json apps/web/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY packages/ packages/
RUN pnpm install --frozen-lockfile

# ── Build ─────────────────────────────────────────────────────────────────────
FROM deps AS build
COPY . .
RUN pnpm --filter @riaya/web build

# ── Runtime ───────────────────────────────────────────────────────────────────
FROM build AS runtime
ENV NODE_ENV=production
EXPOSE 3000
CMD ["pnpm", "--filter", "@riaya/web", "start"]
