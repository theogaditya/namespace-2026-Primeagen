FROM oven/bun:1 AS builder

RUN apk update && apk upgrade --no-cache && \
    apk add --no-cache openssl curl

WORKDIR /app

COPY package.json bun.lock* ./
RUN bun install

COPY artifacts ./artifacts
COPY src ./src
COPY tsconfig.json ./

RUN test -f artifacts/contracts/GrievanceContract.sol/GrievanceContractOptimized.json || \
    (echo "Error: Artifacts not found!" && exit 1)

RUN ./node_modules/.bin/tsc -p tsconfig.json

FROM oven/bun:1-slim
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/artifacts ./artifacts
COPY --from=builder /app/package.json ./

RUN bun install --production

ENV PORT=4100
EXPOSE 4100

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:4100/health || exit 1

CMD ["bun", "run", "dist/server.js"]