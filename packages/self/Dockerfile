FROM oven/bun:1-alpine

WORKDIR /app

RUN apk add --no-cache openssl

# Copy package files
COPY package.json ./

RUN bun install

# Copy application files
COPY . .

# Expose port
EXPOSE 3030

# Start the application (run the file directly so Bun stays in foreground)
CMD ["bun", "index.ts"]
