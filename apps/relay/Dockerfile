# --- Build stage ---
FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable

# Copy workspace manifests for cached install.
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/config/package.json ./packages/config/
COPY packages/protocol/package.json ./packages/protocol/
COPY apps/relay/package.json ./apps/relay/
RUN pnpm install --frozen-lockfile --filter @vsrchat/relay...

# Copy sources and build (tsup bundles workspace deps into one file).
COPY packages/config ./packages/config
COPY packages/protocol ./packages/protocol
COPY apps/relay ./apps/relay
RUN pnpm --filter @vsrchat/protocol build \
  && pnpm --filter @vsrchat/relay build

# --- Runtime stage ---
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/apps/relay/dist ./dist
EXPOSE 8080
CMD ["node", "dist/server.js"]
