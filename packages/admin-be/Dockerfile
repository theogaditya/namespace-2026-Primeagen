FROM oven/bun:1-alpine

RUN apk update && apk upgrade --no-cache && \
    apk add --no-cache openssl curl

WORKDIR /app

COPY package.json bun.lock ./

RUN bun install --frozen-lockfile

COPY prisma ./prisma
COPY . .

ARG DATABASE_URL=postgresql://dummy:dummy@localhost:5432/dummy
ENV DATABASE_URL=$DATABASE_URL

RUN bunx prisma generate

EXPOSE 3000
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["bun", "run", "bin.ts"]


WORKDIR /app

RUN apk add --no-cache openssl

COPY package.json ./
COPY bun.lock* ./

RUN bun install

COPY prisma ./prisma
COPY . .

ARG DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
ENV DATABASE_URL=$DATABASE_URL
RUN bunx prisma generate

EXPOSE 3002

CMD ["bun", "run", "bin.ts"]
