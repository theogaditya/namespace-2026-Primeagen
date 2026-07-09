FROM oven/bun:1-alpine

RUN apk update && apk upgrade --no-cache && \
    apk add --no-cache openssl curl

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

ENV REDIS_URL=redis://default:strongpassword@redis:6379

EXPOSE 3040

CMD ["bun", "run", "bin.ts"]
