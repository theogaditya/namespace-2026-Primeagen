FROM oven/bun:1-alpine

WORKDIR /app

RUN apk add --no-cache openssl

COPY package.json ./
COPY bun.lock* ./

RUN bun install

COPY prisma ./prisma
COPY . .

ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL
RUN bunx prisma generate

EXPOSE 3002

CMD ["bun", "run", "bin.ts"]
