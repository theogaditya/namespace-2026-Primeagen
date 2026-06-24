FROM oven/bun:1
WORKDIR /app
COPY package.json ./

# Install OpenSSH client for EC2 checks
RUN apt-get update && apt-get install -y openssh-client && rm -rf /var/lib/apt/lists/*

RUN bun install

COPY . .

EXPOSE 4000

CMD ["bun", "run", "start"]
