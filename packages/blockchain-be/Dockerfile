FROM oven/bun:1 AS builder

RUN apt-get update && apt-get install -y --no-install-recommends openssl curl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install and build worker
COPY package.json bun.lock* ./
RUN bun install

COPY artifacts ./artifacts
COPY src ./src
COPY tsconfig.json ./

RUN test -f artifacts/contracts/GrievanceContract.sol/GrievanceContractOptimized.json || \
    (echo "Error: Artifacts not found!" && exit 1)

RUN ./node_modules/.bin/tsc -p tsconfig.json

# ── Final stage ──────────────────────────────────────────────
FROM oven/bun:1-slim
RUN apt-get update && apt-get install -y curl openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Copy compiled worker + artifacts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/artifacts ./artifacts
COPY --from=builder /app/package.json ./
RUN bun install --production

# Copy backend source (bun runs TypeScript natively, no tsc needed)
COPY backend/package.json backend/bun.lock* ./backend/
COPY backend/src ./backend/src
COPY backend/prisma ./backend/prisma
COPY backend/tsconfig.json ./backend/
RUN cd backend && bun install

ENV PORT=4100

# Set default Redis URL to local swarm service
# This ensures Redis clients get the correct URL even if loaded before env files
ENV REDIS_URL=redis://default:strongpassword@redis:6379

EXPOSE 4100

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:4100/health || exit 1

# Run both: backend API server on port 4100 (public) and worker on port 3001 (internal)
CMD ["sh", "-c", "trap 'kill 0' INT TERM EXIT; (cd /app/backend && bun run src/server.ts) & (cd /app && PORT=3001 bun run dist/server.js) & wait"]