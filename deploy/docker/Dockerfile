# syntax=docker/dockerfile:1.7
# Stage 1: Build & Package Browser Extension
FROM node:24-alpine AS builder

WORKDIR /app

# Enable corepack for pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package manifests
COPY package.json pnpm-lock.yaml* ./

# Install dependencies deterministically
RUN pnpm install --frozen-lockfile || pnpm install

# Copy source code and specifications
COPY tsconfig.json vite.config.ts vitest.config.ts ./
COPY specs ./specs
COPY public ./public
COPY src ./src

# Typecheck and Build Extension
RUN pnpm run typecheck && pnpm run build

# Stage 2: Minimal OCI Distroless Artifact Server
FROM caddy:2-alpine AS runtime

COPY --from=builder /app/dist /usr/share/caddy

EXPOSE 80

CMD ["caddy", "file-server", "--root", "/usr/share/caddy", "--listen", ":80"]
