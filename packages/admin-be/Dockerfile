FROM oven/bun:1-alpine

RUN apk update && apk upgrade --no-cache && \
    apk add --no-cache openssl curl

WORKDIR /app

COPY package.json ./
COPY bun.lock* ./

RUN bun install

COPY prisma ./prisma
COPY . .

ARG DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
ENV DATABASE_URL=$DATABASE_URL
RUN bunx prisma generate

# Set default Redis URL to local swarm service
# This ensures Redis clients get the correct URL even if loaded before env files
ENV REDIS_URL=redis://default:strongpassword@redis:6379

EXPOSE 3002

CMD ["bun", "run", "bin.ts"]
